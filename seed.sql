INSERT INTO "Role" (name) VALUES ('ADMIN') ON CONFLICT (name) DO NOTHING;
INSERT INTO "Role" (name) VALUES ('MODERATOR') ON CONFLICT (name) DO NOTHING;
INSERT INTO "Role" (name) VALUES ('USER') ON CONFLICT (name) DO NOTHING;

INSERT INTO "User" (email, password, username, "isVerified", "roleId") 
SELECT 'admin@himate.com', '$2b$10$m8f/DUCMwlL6gpNT4uqxtea44j4Das2uAk5BpaZRLAME0ySkWZwnM6', 'HimateAdmin', true, id 
FROM "Role" WHERE name = 'ADMIN'
ON CONFLICT (email) DO UPDATE SET 
    "roleId" = (SELECT id FROM "Role" WHERE name = 'ADMIN'),
    "isVerified" = true,
    password = EXCLUDED.password;
