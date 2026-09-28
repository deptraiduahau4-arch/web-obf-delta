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

// Khởi tạo DB lưu trữ đồng bộ
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

// Thuật toán Obfuscator Cao Cấp (Nhiều lớp bảo mật - Tương thích Delta & Luau)
function advancedObfuscateLuau(sourceCode) {
    const bytes = Array.from(Buffer.from(sourceCode, 'utf-8'));
    const k1 = Math.floor(Math.random() * 150) + 15;
    const k2 = Math.floor(Math.random() * 80) + 5;
    
    // Mã hóa 2 lớp XOR & Shift
    const enc = bytes.map((b, idx) => (b ^ (k1 + (idx % 7))) + k2);
    
    // Đảo ngược chuỗi bytecode để chống đao trực tiếp
    const reversedEnc = enc.reverse();

    return `-- [Protected by Quynh High-Security Obfuscator Engine]
local _R = {${reversedEnc.join(',')}};
local _k1, _k2 = ${k1}, ${k2};
local _B = {};
local _len = #_R;

for _i = 1, _len do
    local _v = _R[_len - _i + 1];
    local _orig = bit32.bxor(_v - _k2, _k1 + ((_i - 1) % 7));
    table.insert(_B, string.char(_orig));
end

local _Code = table.concat(_B);
local _Exec, _Err = loadstring(_Code);
if _Exec then
    _Exec();
else
    error("[Obf Engine Error]: " .. tostring(_Err));
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

// API: Xóa Script (Phân quyền Admin vs Người tạo)
app.delete('/api/scripts/:id', (req, res) => {
    const { id } = req.params;
    const { userKey } = req.body;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).json({ error: "Script không tồn tại hoặc đã bị xóa!" });
    }

    const script = scripts[id];
    const inputKey = (userKey || "").trim();

    // Kiểm tra quyền: Phải trùng Mã Admin HOẶC trùng Mã bí mật của người đăng
    if (inputKey !== ADMIN_KEY && inputKey !== script.creatorKey) {
        return res.status(403).json({ error: "Mã không đúng! Bạn không có quyền xóa script này." });
    }

    delete scripts[id];
    saveScripts(scripts);
    res.json({ success: true, message: "Đã xóa script thành công!" });
});

// API: Lấy danh sách script công khai cho tất cả mọi người
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

// Đường dẫn Raw Execution cho Delta Executor
app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).send('-- [Error]: Script not found or removed.');
    }

    const script = scripts[id];
    const finalCode = script.enableObf ? advancedObfuscateLuau(script.code) : script.code;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(finalCode);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
