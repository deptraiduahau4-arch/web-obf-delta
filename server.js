const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MÃ ADMIN CHỦ WEB: Toàn quyền quản trị & xóa tất cả script
const ADMIN_KEY = "quynh_admin_boss_123";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
const DATA_FILE = path.join(__dirname, 'scripts_db.json');

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

function getScripts() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function saveScripts(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// THUẬT TOÁN BẢO MẬT CAO: BASE64 MULTI-LAYER + BIT SHIFT + ANTI-DECOMPILE
function base64UltraObfuscate(sourceCode) {
    // 1. Mã hóa Base64 cấp 1
    const b64_1 = Buffer.from(sourceCode, 'utf-8').toString('base64');
    
    // 2. Mã hóa XOR + Dynamic Salt
    const salt = Math.floor(Math.random() * 100) + 15;
    const bytes = Array.from(Buffer.from(b64_1, 'utf-8'));
    const xorBytes = bytes.map((b, idx) => b ^ (salt + (idx % 5)));
    
    // 3. Mã hóa Base64 cấp 2 từ mảng XOR
    const b64_2 = Buffer.from(Uint8Array.from(xorBytes)).toString('base64');

    // 4. Sinh biến ngẫu nhiên chống Unpack tự động
    const v1 = "_" + Math.random().toString(36).substring(2, 9);
    const v2 = "_" + Math.random().toString(36).substring(2, 9);
    const v3 = "_" + Math.random().toString(36).substring(2, 9);
    const v4 = "_" + Math.random().toString(36).substring(2, 9);
    const v5 = "_" + Math.random().toString(36).substring(2, 9);

    return `-- [StarEV LUA Hardened Obfuscator v4.0 - Base64 Engine]
local ${v1} = "${b64_2}";
local ${v2} = ${salt};
local ${v3} = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

local function ${v4}(data)
    local chars = ${v3};
    data = string.gsub(data, '[^'..chars..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(chars:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i - f%2^(i-1) > 0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d%d%d%d%d%d', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

local ${v5} = ${v4}(${v1});
local _b = {};
for i = 1, #${v5} do
    local _byte = string.byte(${v5}, i);
    local _orig = bit32.bxor(_byte, ${v2} + ((i - 1) % 5));
    table.insert(_b, string.char(_orig));
end

local _stage1 = table.concat(_b);
local _finalCode = ${v4}(_stage1);

local _exec, _err = loadstring(_finalCode);
if _exec then
    _exec();
else
    error("[StarEV Security]: Memory Integrity Protection Triggered.");
end`;
}

// API: Tạo Script mới
app.post('/api/scripts', upload.single('scriptFile'), (req, res) => {
    const { name, textCode, enableObf, creatorKey } = req.body;
    let codeContent = textCode || "";

    if (req.file) {
        codeContent = fs.readFileSync(req.file.path, 'utf-8');
        try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    if (!name || !codeContent.trim() || !creatorKey) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ Tên, Code và Mã bí mật!" });
    }

    const scripts = getScripts();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    scripts[id] = {
        id,
        name,
        code: codeContent,
        enableObf: enableObf === 'true' || enableObf === true,
        creatorKey: creatorKey.trim(),
        createdAt: new Date().toISOString()
    };

    saveScripts(scripts);
    res.json({ success: true, id, message: "Đăng script thành công!" });
});

// API: Xóa Script
app.delete('/api/scripts/:id', (req, res) => {
    const { id } = req.params;
    const { userKey } = req.body;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).json({ error: "Script không tồn tại hoặc đã bị xóa!" });
    }

    const script = scripts[id];
    const inputKey = (userKey || "").trim();

    if (inputKey !== ADMIN_KEY && inputKey !== script.creatorKey) {
        return res.status(403).json({ error: "Mã không đúng! Bạn không có quyền xóa script này." });
    }

    delete scripts[id];
    saveScripts(scripts);
    res.json({ success: true, message: "Đã xóa script thành công!" });
});

// API: Lấy danh sách script
app.get('/api/scripts', (req, res) => {
    const scripts = getScripts();
    const publicList = Object.values(scripts).map(s => ({
        id: s.id,
        name: s.name,
        enableObf: s.enableObf,
        createdAt: s.createdAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(publicList);
});

// Raw execution cho Delta
app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).send('-- [Error]: Script not found or removed.');
    }

    const script = scripts[id];
    const finalCode = script.enableObf ? base64UltraObfuscate(script.code) : script.code;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(finalCode);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
