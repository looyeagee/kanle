ALTER TABLE site_profile ADD COLUMN site_title TEXT NOT NULL DEFAULT '';

UPDATE site_profile SET site_title = nickname WHERE site_title = '' AND nickname != '';
UPDATE site_profile SET site_title = '看了' WHERE site_title = '';
