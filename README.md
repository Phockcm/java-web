# Hệ thống quản lý máy tính

Hệ thống quản lý máy tính, thiết bị, lịch sử bàn giao/thu hồi và quy trình bảo trì trong doanh nghiệp/trường học.

## Chạy dự án từ USB trên máy Windows

Thư mục dự án đã có bản chụp dữ liệu trong `xampp_migration.sql`. Trên máy mới cần có JDK 21, Node.js 20+ và XAMPP/MySQL (MySQL root mặc định không đặt mật khẩu, cổng 3306). Khởi động MySQL trong XAMPP, mở PowerShell tại thư mục gốc của USB và chạy:

```powershell
npm run migrate
npm run dev
```

Không cần tạo `.env` cho cấu hình mặc định: cả `npm run migrate` và `npm run dev` cùng dùng MySQL `localhost:3306/DoAnJava`, tài khoản `root`, mật khẩu trống. File `.env` chỉ cần nếu thông tin MySQL trên máy khác cấu hình mặc định. Lần đầu, Maven Wrapper có thể cần Internet để tải Maven và thư viện backend; nếu USB không có `frontend/node_modules`, chạy `npm install --prefix frontend` một lần.

File migration chứa dữ liệu khách hàng và hash mật khẩu; giữ USB an toàn.

Maven Wrapper sẽ tự tải Maven và các thư viện backend trong lần chạy đầu tiên. Nếu backend không khởi động, kiểm tra JDK bằng `java -version`; script sẽ báo lỗi thay vì mở giao diện khi backend chưa sẵn sàng.

- Giao diện: [http://localhost:5173](http://localhost:5173)
- Cửa hàng khách hàng: [http://localhost:5173/store](http://localhost:5173/store)
- Backend API: [http://localhost:8080](http://localhost:8080)
- Swagger: [http://localhost:8080/docs](http://localhost:8080/docs)

### Dùng bằng điện thoại trong cùng mạng Wi-Fi

Chạy `npm run web` trên máy tính và mở địa chỉ `Điện thoại` được in trong Terminal trên điện thoại (cả hai thiết bị cần cùng Wi-Fi). Nếu không kết nối được, cho phép Java và Node.js qua Windows Firewall trên mạng Private. Không dùng `localhost` trên điện thoại vì địa chỉ đó trỏ về chính điện thoại; API sẽ được chuyển tiếp qua máy tính chạy ứng dụng.

### Dùng MySQL/XAMPP

Khởi động MySQL trước. Tạo `.env` ở thư mục gốc (có thể sao chép `.env.example`) với thông tin kết nối:

```powershell
DB_URL=jdbc:mysql://localhost:3306/DoAnJava?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=root
DB_PASSWORD=
FLYWAY_ENABLED=true
```

Đây là luồng được hỗ trợ cho XAMPP/MySQL; `xampp_migration.sql` khôi phục bản chụp dữ liệu và một schema tương thích đến V14, đồng thời đăng ký lịch sử Flyway đến V10. Khi backend khởi động, Flyway tự áp dụng các migration còn thiếu; với database mới, Flyway chạy đầy đủ từ V1. `FLYWAY_ENABLED=true` là mặc định và nên giữ bật để schema cũ/mới được nâng cấp tự động. Ảnh sản phẩm được lưu dưới dạng đường dẫn `image_url` trong database; các sản phẩm có hãng tương ứng dùng ảnh cùng hãng từ `frontend/public`, Store ưu tiên đường dẫn này trước ảnh dự phòng. Mặc định cả `npm run migrate` lẫn `npm run dev` cùng dùng MySQL `localhost:3306/DoAnJava`, user `root`, mật khẩu trống. Nếu MySQL trên máy khác có cấu hình riêng, đặt `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` giống nhau trong `.env`. Chạy lại migration không xóa tài khoản cũ hoặc đặt lại mật khẩu, không ghi đè dữ liệu đã chỉnh và không nhân đôi dữ liệu mẫu; riêng hai trường văn bản demo cũ bị lỗi dấu hỏi sẽ được sửa an toàn. File migration chứa dữ liệu khách hàng và hash mật khẩu; giữ USB an toàn, không tải file này lên kho mã nguồn công khai.

Nếu backend đã chạy trước khi đổi `.env` hoặc cập nhật mã nguồn, hãy dừng backend cũ rồi chạy lại `npm run web`. Launcher kiểm tra cả database lẫn phiên bản API (hiện là 5); nếu backend cũ không tương thích, frontend sẽ không khởi động nhầm với dữ liệu hoặc API sai phiên bản.

---

## 📁 Cấu Trúc Thư Mục

Dự án giữ nguyên hai ứng dụng riêng `backend/` và `frontend/`, đồng thời tổ chức mã nguồn theo kiến trúc phân lớp và module tính năng tương tự cách sắp xếp trong thư mục tham khảo `QLShop/`. Thư mục tham khảo chỉ dùng để đối chiếu cấu trúc; mã nguồn, tên miền, API và nghiệp vụ của dự án vẫn là hệ thống quản lý máy tính.

```text
doanJava/
├── backend/
│   └── src/
│       ├── main/java/vn/doan/assetmanager/
│       │   ├── AssetManagerApplication.java
│       │   ├── config/                 # Cấu hình, OpenAPI và dữ liệu khởi tạo
│       │   ├── controller/             # REST API quản trị, bán hàng và cửa hàng
│       │   ├── dto/request/            # Dữ liệu đầu vào API
│       │   ├── dto/response/           # Dữ liệu phản hồi API
│       │   ├── entity/                 # Entity JPA
│       │   │   └── enums/              # Trạng thái, loại thiết bị và vai trò
│       │   ├── exception/              # Ngoại lệ và xử lý lỗi API
│       │   ├── repository/             # Spring Data JPA
│       │   ├── security/               # JWT và cấu hình bảo mật
│       │   ├── service/                # Nghiệp vụ máy tính, bán hàng và cửa hàng
│       │   └── specification/          # Bộ lọc JPA cho kho tài sản
│       ├── main/resources/             # Cấu hình và db/migration
│       └── test/java/vn/doan/assetmanager/
│
├── frontend/
│   └── src/
│       ├── App.tsx                     # Điểm điều hướng quản trị/cửa hàng
│       ├── components/common/           # Thành phần giao diện dùng chung
│       ├── features/
│       │   ├── admin-assets/
│       │   │   ├── pages/               # Kho máy
│       │   │   └── components/          # Form và chi tiết thiết bị
│       │   ├── admin-catalog/           # Danh mục hãng, sản phẩm
│       │   ├── admin-customers/         # Khách hàng
│       │   ├── admin-dashboard/         # Tổng quan
│       │   ├── admin-maintenance/       # Bảo trì
│       │   ├── admin-orders/            # POS và quản lý đơn hàng
│       │   ├── admin-reviews/           # Đánh giá
│       │   ├── admin-users/             # Người dùng và phân quyền
│       │   ├── auth/                    # Đăng nhập
│       │   └── shop/
│       │       ├── shop-home/pages/     # Giao diện cửa hàng
│       │       └── users/pages/         # Tài khoản khách
│       ├── lib/types.ts                 # Kiểu dữ liệu dùng chung
│       ├── services/api.ts              # Client REST API
│       ├── utils/formatters.ts          # Hàm tiện ích và định dạng
│       ├── main.tsx
│       └── styles.css
│
├── scripts/                             # Khởi chạy và công cụ migration
├── xampp_migration.sql                  # Cơ sở dữ liệu DoAnJava
├── docker-compose.yml
├── package.json
├── README.md
└── QLShop/                              # Thư mục tham khảo, không phải mã nguồn DoAnJava
```

---

## ⚡ Hướng Dẫn Khởi Chạy Nhanh (Windows)

### Cách 1: Dùng lệnh `npm run web` (Mới)
Ở thư mục gốc dự án, chỉ cần mở Terminal và gõ:
```powershell
npm run web
```
*(Hệ thống sẽ tự động khởi động đồng thời cả Spring Boot Backend và React Vite Frontend, tự kiểm tra cổng và hiển thị link truy cập).*

---

### 🗄️ Hướng Dẫn Migration CSDL Cho XAMPP (MySQL)

Dự án đã chuẩn bị sẵn file [xampp_migration.sql](./xampp_migration.sql) gồm cấu trúc bảng và bản chụp dữ liệu database **`DoAnJava`**. Trên máy mới, chỉ cần bật MySQL trong XAMPP rồi chạy `npm run migrate` và `npm run dev` tại thư mục gốc; không cần `.env` với cấu hình MySQL mặc định.

Bạn có thể chạy migration theo một trong 2 cách:

#### Cách 1: Dùng lệnh tự động (Khuyên dùng)
Bật MySQL trong **XAMPP Control Panel**, sau đó chạy lệnh tại thư mục gốc:
```powershell
npm run migrate
```
*(Script mặc định dùng MySQL root không mật khẩu trên localhost:3306, nạp schema/bản chụp và in thống kê số bản ghi).*

#### Cách 2: Import thủ công vào phpMyAdmin
1. Mở XAMPP Control Panel, nhấn **Start** tại mục MySQL.
2. Mở trình duyệt vào [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Bấm vào thẻ **Import** (Nhập) trên thanh menu.
4. Chọn file **`xampp_migration.sql`** tại thư mục gốc của đồ án.
5. Cuộn xuống và nhấn **Import** (hoặc **Thực hiện**).

---

### 🌐 Khởi Chạy Toàn Bộ Hệ Thống (`npm run web`)

Chỉ cần mở Terminal tại thư mục gốc và chạy:
```powershell
npm run web
```
*(Hệ thống tự khởi động backend và frontend; mặc định cùng dùng MySQL DoAnJava như lệnh migration).*

- **Giao diện Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **Tài liệu Swagger:** [http://localhost:8080/docs](http://localhost:8080/docs)

---

### Chỉ khởi chạy giao diện (phục vụ debug)

```powershell
cd frontend
npm run dev
```

Lệnh này chỉ chạy Vite, không khởi động backend. Để sử dụng đầy đủ ứng dụng và đúng cấu hình `.env`, hãy chạy `npm run dev` hoặc `npm run web` tại thư mục gốc dự án.

---

## Đăng nhập mặc định

| Tài khoản | Mật khẩu | Quyền hạn (Role) | Mô tả |
| :--- | :--- | :--- | :--- |
| **`admin`** | **`123`** | **ADMIN** | Quản trị viên cao nhất, toàn quyền quản lý thiết bị, người dùng |
| **`staff`** | **`123`** | **STAFF** | Nhân viên thanh toán, xem kho và gửi phản hồi/yêu cầu bảo trì |
| **`fixer`** | **`123`** | **FIXER** | Chỉ truy cập mục bảo trì; được xử lý và hoàn tất phiếu |

Đổi thông tin mặc định bằng `ADMIN_USERNAME` và `ADMIN_PASSWORD` trong cấu hình môi trường trước khi triển khai.

`staff` và `fixer` được tạo với mật khẩu ban đầu `123` khi CSDL chưa có các tài khoản này. Các thay đổi mà Admin lưu trong mục Quản trị tài khoản được giữ lại sau khi khởi động lại; không dùng mật khẩu demo khi triển khai thực tế. `ADMIN_USERNAME` và `ADMIN_PASSWORD` chỉ được dùng khi tạo tài khoản Admin đầu tiên.

Thanh toán QR tại quầy dùng VietQR tạo ngay trên trình duyệt, không gửi thông tin tài khoản tới dịch vụ QR bên ngoài. Để bật, điền `VITE_VIETQR_BANK_BIN` (BIN ngân hàng 6 số), `VITE_VIETQR_ACCOUNT_NUMBER` và `VITE_VIETQR_ACCOUNT_NAME` trong file `.env` ở thư mục gốc rồi khởi động lại `npm run dev`. QR chứa số tiền và nội dung chuyển khoản POS; nhân viên quét/đối chiếu giao dịch rồi bấm **Xác nhận đã nhận chuyển khoản** để lưu đơn và xuất hóa đơn. QR chuyển khoản vẫn được in trên hóa đơn.

Trang cửa hàng công khai hiển thị thiết bị có giá đang sẵn sàng để khách tìm kiếm, lọc theo thương hiệu và xem chi tiết. Dữ liệu mẫu đã bổ sung 10 máy AVAILABLE cho mỗi model trong cửa hàng; mỗi máy dùng mã tài sản riêng, không cần số serial giả. Khi khởi động ứng dụng, bộ khởi tạo không còn ngẫu nhiên chuyển phần lớn sản phẩm mẫu sang trạng thái ngừng kinh doanh. Mỗi sản phẩm có trang chi tiết với thông số bộ xử lý, RAM, bộ nhớ, màn hình, tần số quét, cổng USB, jack tai nghe và card đồ họa rời. Các thông số minh họa không thay thế cấu hình do nhà sản xuất xác nhận.

Khách tạo tài khoản riêng tại `/store/register` hoặc đăng nhập tại `/store/login`; tài khoản này không dùng được để đăng nhập trang quản trị. Cần đăng nhập và bổ sung số điện thoại trong `/store/account` trước khi gửi yêu cầu mua hàng. Giỏ hàng chỉ cho phép thêm sản phẩm từ trang chi tiết, được lưu trên trình duyệt; yêu cầu gửi lên máy chủ lấy danh tính và số điện thoại từ tài khoản đã xác thực, không nhận tên/số điện thoại do trình duyệt tự khai. Admin quản lý tài khoản khách trong Quản trị tài khoản → Khách hàng, có thể sửa thông tin, khóa/mở khóa và đặt lại mật khẩu.

Giỏ hàng gửi yêu cầu mua hàng để nhân viên xác nhận; chưa thu tiền trực tuyến hay tự động trừ tồn kho. Admin có thể chuyển thiết bị, khách hàng, tài khoản và hóa đơn vào Thùng rác, khôi phục hoặc xóa vĩnh viễn. Mật khẩu được lưu dưới dạng BCrypt nên không thể xem lại mật khẩu cũ; Admin có thể đặt lại mật khẩu trong phần Quản trị tài khoản.

Ảnh sản phẩm trong cửa hàng là ảnh minh họa theo loại thiết bị, được lưu cục bộ trong `frontend/public/products` để vẫn hiển thị khi máy chạy không có Internet. Ảnh có thể dùng chung cho nhiều mẫu: [laptop](https://images.unsplash.com/photo-1496181133206-80ce9b88a853), [desktop](https://images.unsplash.com/photo-1587831990711-23ca6441447b), [monitor](https://images.unsplash.com/photo-1527443224154-c4a3942d3acf), từ [Unsplash](https://unsplash.com/license).

Yêu cầu cùng sản phẩm được lưu trong `sale_orders` với trạng thái chờ xác nhận và liên kết tới hồ sơ khách hàng mới hoặc hồ sơ đang hoạt động có cùng số điện thoại. Nếu số điện thoại thuộc hồ sơ trong Thùng rác, Admin cần khôi phục hồ sơ đó trước khi gửi yêu cầu. Admin xử lý yêu cầu trong mục POS → Lịch sử đơn hàng: chốt đơn sẽ đánh dấu thiết bị đã bán và cập nhật chi tiêu/hạng thành viên; từ chối yêu cầu không làm thay đổi tồn kho. Việc chốt yêu cầu chỉ ghi nhận đơn được xác nhận, không phải xác nhận thanh toán. Database migration V6/V7 thêm trạng thái xử lý/liên kết đơn hàng; V8 thêm thông số sản phẩm và bảng tài khoản khách.

## Khởi tạo dữ liệu

Ứng dụng mặc định dùng MySQL/XAMPP; trên máy mới, chạy `npm run migrate` tại thư mục gốc để tạo schema và khôi phục dữ liệu đã đóng gói trong `xampp_migration.sql`. Flyway tự nâng cấp database khi backend khởi động; profile H2 dùng cấu hình riêng, tắt Flyway và lưu trong bộ nhớ, nên không thay thế dữ liệu MySQL đã migrate và sẽ mất dữ liệu khi ứng dụng dừng. Các migration phiên bản trong `backend/src/main/resources/db/migration` phục vụ nâng cấp schema: V4.1 tạo các bảng khách hàng, đánh giá và đơn hàng cần thiết trước khi các migration V5-V9 mở rộng chúng; V8 bổ sung thông số sản phẩm và tài khoản cửa hàng, V9 liên kết tài khoản cửa hàng với hồ sơ thành viên, V10 bổ sung lượt xem sản phẩm và yêu cầu sửa chữa của khách, V11 bổ sung danh mục hãng sản phẩm và hỗ trợ đưa hãng vào thùng rác, V12 sửa dữ liệu văn bản demo bị thay bằng dấu hỏi, V13 bổ sung đường dẫn hình ảnh trong database, V14 đồng bộ ảnh sản phẩm với đúng hãng, V15 bổ sung ảnh yêu cầu sửa chữa, V16 chuẩn hóa vai trò CASHIER thành STAFF và V17 cập nhật tên mẫu cũ. Lệnh `npm run snapshot` cũng đóng gói các đường dẫn ảnh sản phẩm đã lưu trong database cùng trạng thái hãng/thùng rác để chuyển máy.

Trong mục **Danh mục sản phẩm**, Admin có thể thêm/sửa hãng, chuyển hãng vào thùng rác và khôi phục. Các sản phẩm đang mang hãng đó được giữ nguyên khi hãng bị chuyển vào thùng rác; không thể xóa vĩnh viễn hãng nếu vẫn còn sản phẩm dùng hãng này.

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend:** Java 21 LTS, Spring Boot 3.5.6, Spring Security 6 (Stateless JWT), Spring Data JPA, Hibernate, Flyway Database Migration, H2 / MySQL 8.4, SpringDoc OpenAPI 3 (Swagger UI).
- **Frontend:** React 19, TypeScript 5.7, Vite 6, Lucide Icons, Vanilla CSS Design System.
- **Testing:** JUnit 5, Mockito, Vitest, Testing Library.
