const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MÃ ADMIN CHỦ WEB: Sửa/Xóa tất cả script trên hệ thống
const ADMIN_KEY = "quynh_admin_boss_123";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
const DATA_FILE = path.join(__dirname, 'scripts_db.json');

// Khởi tạo Database lưu trữ bằng file JSON
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

// Thuật toán Mã Hóa (Obfuscation) tương thích Delta & Luau Client
function obfuscateLuau(code) {
    const bytes = Array.from(Buffer.from(code, 'utf-8'));
    const key = Math.floor(Math.random() * 200) + 10;
    const xorBytes = bytes.map(b => b ^ key);
    
    return `-- [Obfuscated by Quynh's Web Engine]
local _k = ${key};
local _b = {${xorBytes.join(',')}};
local _s = "";
for i = 1, #_b do
    _s = _s .. string.char(bit32.bxor(_b[i], _k))
end;
local _f, _e = loadstring(_s);
if _f then _f() else error(_e) end`;
}

// API: Tạo Script mới (Chấp nhận cả Text và File)
app.post('/api/scripts', upload.single('scriptFile'), (req, res) => {
    const { name, textCode, enableObf, creatorKey } = req.body;
    let codeContent = textCode || "";

    if (req.file) {
        codeContent = fs.readFileSync(req.file.path, 'utf-8');
        try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    if (!name || !codeContent.trim() || !creatorKey) {
        return res.status(400).json({ error: "Thiếu tên script, nội dung code hoặc mã bí mật người tạo!" });
    }

    const scripts = getScripts();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    scripts[id] = {
        id,
        name,
        code: codeContent,
        enableObf: enableObf === 'true' || enableObf === true,
        creatorKey,
        createdAt: new Date().toISOString()
    };

    saveScripts(scripts);
    res.json({ success: true, id, message: "Tạo script thành công!" });
});

// API: Chỉnh sửa Script (Chủ web hoặc Người tạo đúng Mã)
app.put('/api/scripts/:id', upload.single('scriptFile'), (req, res) => {
    const { id } = req.params;
    const { name, textCode, enableObf, userKey } = req.body;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).json({ error: "Script không tồn tại!" });
    }

    const script = scripts[id];

    if (userKey !== ADMIN_KEY && userKey !== script.creatorKey) {
        return res.status(403).json({ error: "Bạn không có quyền sửa script này!" });
    }

    let codeContent = textCode || script.code;
    if (req.file) {
        codeContent = fs.readFileSync(req.file.path, 'utf-8');
        try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    scripts[id] = {
        ...script,
        name: name || script.name,
        code: codeContent,
        enableObf: enableObf !== undefined ? (enableObf === 'true' || enableObf === true) : script.enableObf,
        updatedAt: new Date().toISOString()
    };

    saveScripts(scripts);
    res.json({ success: true, message: "Cập nhật thành công!" });
});

// API: Lấy danh sách script public
app.get('/api/scripts', (req, res) => {
    const scripts = getScripts();
    const publicList = Object.values(scripts).map(s => ({
        id: s.id,
        name: s.name,
        enableObf: s.enableObf,
        createdAt: s.createdAt
    }));
    res.json(publicList);
});

// Đường dẫn Raw Execution cho Delta & Client Lua
app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const scripts = getScripts();

    if (!scripts[id]) {
        return res.status(404).send('-- Script not found');
    }

    const script = scripts[id];
    const finalCode = script.enableObf ? obfuscateLuau(script.code) : script.code;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(finalCode);
});

app.listen(PORT, () => console.log(`Server chạy tại port: ${PORT}`));
