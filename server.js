const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// API 1: Tạo email mới
app.post('/api/generate-mail', async (req, res) => {
    try {
        const response = await axios.post('https://otpmail.vn/api/generate', {}, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi tạo email' });
    }
});

// API 2: Kiểm tra hộp thư (đã tối ưu để lấy thẳng nội dung)
app.get('/api/check-inbox/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const encodedEmail = encodeURIComponent(email);
        
        const inboxRes = await axios.get(`https://otpmail.vn/api/inbox/${encodedEmail}?limit=50`);
        let messages = inboxRes.data;

        if (messages && messages.data && Array.isArray(messages.data)) {
            messages = messages.data;
        }

        if (Array.isArray(messages) && messages.length > 0) {
            const latestMsg = messages[0];
            const msgId = latestMsg.id || latestMsg._id || latestMsg.messageId || latestMsg.uid;

            if (msgId) {
                try {
                    const msgDetailRes = await axios.get(`https://otpmail.vn/api/message/${msgId}`);
                    // Trả về cả chi tiết lẫn tin nhắn gốc để đảm bảo không bị thiếu dữ liệu
                    return res.json([msgDetailRes.data, latestMsg]);
                } catch (err) {
                    // Nếu lỗi gọi API chi tiết, dùng tạm tin nhắn gốc trong inbox
                    return res.json([latestMsg]);
                }
            } else {
                return res.json([latestMsg]);
            }
        }
        res.json([]);
    } catch (error) {
        console.log("Lỗi check inbox:", error.message);
        res.status(500).json({ error: 'Lỗi đọc hộp thư' });
    }
});

app.listen(3000, () => {
    console.log('Server đang chạy tại cổng 3000');
});
app.post('/api/vmos/claim-free', async (req, res) => {
    const { token, userId } = req.body;
    
    try {
        // Gọi API của VMOS Cloud bằng Authorization Bearer Token
        const response = await axios.post('https://api.vmoscloud.com/v1/user/equipment/claimFree', {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10)'
            }
        });

        res.json({
            success: true,
            deviceInfo: response.data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể nhận máy dùng thử' });
    }
});
// Gọi hàm này sau khi lấy được Token và UserId từ VMOS
async function tuDongMuaMayFree(token, userId) {
    // Hiển thị khung kết quả
    document.getElementById('stepResult').style.display = 'block';
    document.getElementById('txtToken').innerText = token.substring(0, 10) + '...';
    document.getElementById('txtUserId').innerText = userId;
    document.getElementById('buyStatus').innerText = '⏳ Đang gửi yêu cầu nhận máy...';

    try {
        // Gửi Token về backend Node.js local của bạn
        let res = await fetch('http://localhost:3000/api/vmos/claim-free', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, userId: userId })
        });
        let data = await res.json();

        if (data.success) {
            document.getElementById('buyStatus').innerHTML = '✅ Mua được máy thành công!';
            // Thêm máy vào giao diện danh sách máy chính
            hienThiCloudPhone(data.deviceInfo);
        } else {
            document.getElementById('buyStatus').innerHTML = '❌ Lỗi nhận máy: ' + data.message;
        }
    } catch (e) {
        document.getElementById('buyStatus').innerHTML = '❌ Lỗi kết nối Server!';
    }
}