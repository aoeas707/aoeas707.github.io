/**
 * 梗百科 - 自动同步 Worker
 * 部署到 Cloudflare Workers，GitHub Token 保存在服务端，安全可靠。
 * 
 * 支持读写仓库内任意文件，通过 action 和 path 参数控制。
 *   action: 'read'  → 读取文件内容
 *   action: 'write' → 写入文件（默认）
 *   path:   文件路径，默认 'data.js'，如 'reviews.json'
 */

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 只允许 GET 和 POST
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let body = {};
    if (request.method === 'POST') {
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { owner, repo, secret, content, path, action } = body;

    // 验证同步密钥
    if (!secret || secret !== env.SYNC_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!owner || !repo) {
      return new Response(JSON.stringify({ error: 'Missing owner or repo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = env.GITHUB_TOKEN;
    const filePath = path || 'data.js';
    const apiBase = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + filePath;

    // ========== READ 模式 ==========
    if (action === 'read') {
      return handleRead(apiBase, token);
    }

    // ========== WRITE 模式（默认） ==========
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content for write' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return handleWrite(apiBase, token, content);
  }
};

/**
 * 读取 GitHub 文件内容
 */
async function handleRead(apiBase, token) {
  try {
    const resp = await fetch(apiBase, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'meme-wiki-worker'
      }
    });

    if (!resp.ok) {
      // 404 表示文件不存在，返回空内容
      if (resp.status === 404) {
        return new Response(JSON.stringify({ success: true, content: '', sha: null }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: '读取文件失败: ' + resp.status, detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fileInfo = await resp.json();
    // GitHub API 返回的 content 是 base64 编码的
    const content = decodeURIComponent(escape(atob(fileInfo.content.replace(/\n/g, ''))));

    return new Response(JSON.stringify({ success: true, content: content, sha: fileInfo.sha }), {
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

/**
 * 写入 GitHub 文件
 */
async function handleWrite(apiBase, token, content) {
  try {
    let sha = null;
    let commitMsg = '自动同步: 更新文件';

    // 1. 先尝试获取当前文件的 SHA（文件可能不存在）
    const getResp = await fetch(apiBase, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'meme-wiki-worker'
      }
    });

    if (getResp.ok) {
      const fileInfo = await getResp.json();
      sha = fileInfo.sha;
    } else if (getResp.status !== 404) {
      const errText = await getResp.text();
      return new Response(JSON.stringify({ error: '获取文件信息失败: ' + getResp.status, detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // 404 表示文件不存在，sha 为 null，GitHub API 会创建新文件

    // 2. 更新/创建文件
    const putBody = {
      message: commitMsg,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: 'main'
    };
    if (sha) putBody.sha = sha;

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
