-- Friends see which hobbies you track (names only), so they can connect over shared ones.
IF COL_LENGTH('dbo.Profiles', 'Hobbies') IS NULL
ALTER TABLE dbo.Profiles ADD Hobbies nvarchar(4000) NULL;
