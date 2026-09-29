const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// MÃ ADMIN CHỦ WEB: Toàn quyền quản trị & xóa tất cả script
const ADMIN_KEY = "quynh_admin_boss_123";

// Cấu hình Chuỗi Kết Nối Database Cloud MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://deptraiduahau4_db_user:9tCyK8j2M6w3yr1H@cluster0.ja5qluv.mongodb.net/starev_db?retryWrites=true&w=majority";

// Kết nối CSDL Đám mây MongoDB Atlas
mongoose.connect(MONGO_URI)
    .then(() => console.log('[StarEV DB]: Đã kết nối MongoDB Cloud! Script sẽ được lưu vĩnh viễn.'))
    .catch(err => console.error('[StarEV DB Error]: Không thể kết nối MongoDB:', err.message));

// Định nghĩa Schema lưu trữ Script
const scriptSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    enableObf: { type: Boolean, default: true },
    creatorKey: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Script = mongoose.model('Script', scriptSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

// -----------------------------------------------------------------
// THUẬT TOÁN OBFUSCATE TỐI ƯU 100% CHO DELTA X (LUAU / LUA 5.1 ENGINE)
// -----------------------------------------------------------------
function deltaXObfuscate(sourceCode) {
    if (!sourceCode) return '';
    
    const bytes = Array.from(Buffer.from(sourceCode, 'utf-8'));
    const key = Math.floor(Math.random() * 200) + 15;
    const xorBytes = bytes.map((b, i) => b ^ (key + (i % 7)));

    const vKey = "_k" + Math.random().toString(36).substring(2, 7);
    const vData = "_d" + Math.random().toString(36).substring(2, 7);
    const vStr = "_s" + Math.random().toString(36).substring(2, 7);
    const vByte = "_b" + Math.random().toString(36).substring(2, 7);
    const vXor = "_x" + Math.random().toString(36).substring(2, 7);

    return `-- [StarEV LUA Hardened - Delta X Native Engine]
local ${vKey} = ${key}
local ${vData} = {${xorBytes.join(',')}}
local ${vStr} = {}

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
    if _fn me
        return _fn()
    else
        error("[StarEV Security]: Execution Error - " .. tostring(_syntaxErr))
    end
else
    error("[StarEV Security]: Executor not supported.")
end`;
}

// API: Đăng Script Mới lên Cloud
app.post('/api/scripts', upload.single('scriptFile'), async (req, res) => {
    try {
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

        const newScript = new Script({
            name: name.trim(),
            code: codeContent,
            enableObf: enableObf === 'true' || enableObf === true,
            creatorKey: creatorKey.trim()
        });

        await newScript.save();
        res.json({ success: true, id: newScript._id, message: "Đăng script thành công!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi kết nối cơ sở dữ liệu!" });
    }
});

// API: Xóa Script
app.delete('/api/scripts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userKey } = req.body;

        const script = await Script.findById(id);
        if (!script) {
            return res.status(404).json({ error: "Script không tồn tại hoặc đã bị xóa!" });
        }

        const inputKey = (userKey || "").trim();
        if (inputKey !== ADMIN_KEY && inputKey !== script.creatorKey) {
            return res.status(403).json({ error: "Mã không đúng! Bạn không có quyền xóa script này." });
        }

        await Script.findByIdAndDelete(id);
        res.json({ success: true, message: "Đã xóa script thành công!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi xử lý xóa script!" });
    }
});

// API: Lấy danh sách script công khai
app.get('/api/scripts', async (req, res) => {
    try {
        const scripts = await Script.find().sort({ createdAt: -1 });
        const publicList = scripts.map(s => ({
            id: s._id,
            name: s.name,
            enableObf: s.enableObf,
            createdAt: s.createdAt
        }));
        res.json(publicList);
    } catch (err) {
        res.status(500).json({ error: "Không thể lấy danh sách script!" });
    }
});

// Raw execution cho Delta X
app.get('/raw/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const script = await Script.findById(id);

        if (!script) {
            return res.status(404).send('-- [Error]: Script not found or removed.');
        }

        const finalCode = script.enableObf ? deltaXObfuscate(script.code) : script.code;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(finalCode);
    } catch (err) {
        res.status(500).send('-- [Error]: Internal Database Error.');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
