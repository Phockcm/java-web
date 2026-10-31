UPDATE app_users
SET display_name = 'Nhân viên'
WHERE username = 'staff'
  AND display_name = 'Nguyễn Thu Ngân';

UPDATE app_users
SET display_name = 'Kỹ thuật viên'
WHERE username = 'fixer'
  AND display_name = 'Nguyễn Kỹ Thuật';
