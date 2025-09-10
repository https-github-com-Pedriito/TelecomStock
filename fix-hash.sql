-- Script de correction du hash pour tech@telecom.com
UPDATE users 
SET password_hash = '$2b$10$hEvogaYhVE4wryHeMYY.hObrt6eWoPHjmQTxjGTp7vfL38PjB1PlC' 
WHERE email = 'tech@telecom.com';
