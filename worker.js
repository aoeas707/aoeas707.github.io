/**
 * 梗百科 - 自动同步 Worker
 * 部署到 Cloudflare Workers，GitHub Token 保存在服务端，安全可靠。
 */

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 只允许 POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { owner, repo, secret, content } = body;

    // 验证同步密钥
    if (!secret || secret !== env.SYNC_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!owner || !repo || !content) {
      return new Response(JSON.stringify({ error: 'Missing owner, repo, or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = env.GITHUB_TOKEN;
    const apiBase = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/data.js';

    try {
      // 1. 获取当前文件的 SHA
      const getResp = await fetch(apiBase, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'meme-wiki-worker'
        }
      });

      if (!getResp.ok) {
        const errText = await getResp.text();
        return new Response(JSON.stringify({ error: '获取文件信息失败: ' + getResp.status, detail: errText }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const fileInfo = await getResp.json();
      const sha = fileInfo.sha;

      // 2. 更新文件
      const putBody = {
        message: '自动同步: 更新梗数据',
        content: btoa(unescape(encodeURIComponent(content))),
        sha: sha,
        branch: 'main'
      };

      const putResp = await fetch(apiBase, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'meme-wiki-worker'
        },
        body: JSON.stringify(putBody)
      });

      if (!putResp.ok) {
        const errData = await putResp.json().catch(() => ({}));
        return new Response(JSON.stringify({ error: '同步失败', detail: errData.message || putResp.status }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: '服务器内部错误: ' + e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
