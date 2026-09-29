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

// -----------------------------------------------------------------
// THUẬT TOÁN OBFUSCATE TỐI ƯU 100% CHO DELTA X (LUAU / LUA 5.1 ENGINE)
// Chống crash, tương thích hoàn toàn trên Mobile Executable!
// -----------------------------------------------------------------
function deltaXObfuscate(sourceCode) {
    if (!sourceCode) return '';
    
    const bytes = Array.from(Buffer.from(sourceCode, 'utf-8'));
    const key = Math.floor(Math.random() * 200) + 15;
    const xorBytes = bytes.map((b, i) => b ^ (key + (i % 7)));

    // Sinh biến ngẫu nhiên bảo mật
    const vKey = "_k" + Math.random().toString(36).substring(2, 7);
    const vData = "_d" + Math.random().toString(36).substring(2, 7);
    const vStr = "_s" + Math.random().toString(36).substring(2, 7);
    const vByte = "_b" + Math.random().toString(36).substring(2, 7);
    const vXor = "_x" + Math.random().toString(36).substring(2, 7);

    return `-- [StarEV LUA Hardened - Delta X Native Engine]
local ${vKey} = ${key}
local ${vData} = {${xorBytes.join(',')}}
local ${vStr} = {}

-- Bitwise XOR tương thích tuyệt đối cho Luau/Delta X
local function ${vXor}(a, b)
    if bit32 and bit32.bxor then
        return bit32.bxor(a, b)
    end
    local r, p = 0, 1
    while a > 0 and b > 0 do
        local ra, rb = a % 2, b % 2
        if ra ~= rb then r = r + p end
        a, b, p = (a - ra) / 2, (b - rb) / 2, p * 2
    end
    return r + (a + b) * p
end

for i = 1, #${vData} do
    local ${vByte} = ${vXor}(${vData}[i], ${vKey} + ((i - 1) % 7))
    table.insert(${vStr}, string.char(${vByte}))
end

local _code = table.concat(${vStr})
local _exec, _err = loadstring or load
if _exec then
    local _fn, _syntaxErr = _exec(_code)
    if _fn then
        return _fn()
    else
        error("[StarEV Security]: Execution Error - " .. tostring(_syntaxErr))
    end
else
    error("[StarEV Security]: Executor not supported.")
end`;
}

// API: Tạo Script mới
app.post('/api/scripts', upload.single('scriptFile'), (req, res) => {
    const { name, textCode, enableObf, creatorKey } = req.body;
    let codeContent = textCode || "";

    if (req.file) {
        try {
            codeContent = fs.readFileSync(req.file.path, 'utf-8');
            fs.unlinkSync(req.file.path);
        } catch (e) {}
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

// API: Lấy danh sách script công khai
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

// Raw execution cho Delta X
app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).send('-- [Error]: Script not found or removed.');
    }

    const script = scripts[id];
    const finalCode = script.enableObf ? deltaXObfuscate(script.code) : script.code;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(finalCode);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
