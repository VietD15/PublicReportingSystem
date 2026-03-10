# PublicReportingSystem

Backend API cho hệ thống báo cáo công khai với xác thực người dùng và Google OAuth2.

## Cài đặt

```bash
npm install
```

## Cấu hình

1. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

2. Cập nhật các biến môi trường trong `.env`:
   - `SECRET_KEY`: Khóa bí mật cho JWT
   - `JWT_REFRESH_SECRET`: Khóa bí mật cho refresh token
   - `MONGODB_URI`: URI kết nối MongoDB
   - `GOOGLE_CLIENT_ID`: Client ID từ Google Cloud Console (cho Google Login)

### Cấu hình Google OAuth2

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** > **Credentials**
4. Tạo **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000` (hoặc domain của bạn)
   - Authorized redirect URIs: Thêm URLs cần thiết cho frontend
5. Copy **Client ID** và paste vào `.env` file

## Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập bằng email/username
- `POST /api/auth/login-google` - Đăng nhập bằng Google
- `POST /api/auth/refresh` - Làm mới access token
- `POST /api/auth/logout` - Đăng xuất

### Google Login API

**Endpoint:** `POST /api/auth/login-google`

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4M..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome back username",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "123456",
    "userName": "username",
    "email": "user@example.com"
  }
}
```

**Lưu ý:** 
- Sử dụng ID Token từ Google (không phải Access Token)
- Token được verify với Google trước khi tạo session
- Tự động tạo tài khoản mới nếu email chưa tồn tại

## Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Google OAuth2
- bcrypt
- Rate limiting