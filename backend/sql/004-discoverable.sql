-- Name search: people can turn off being found by name (then they can only be added by code).
IF COL_LENGTH('dbo.Profiles', 'Discoverable') IS NULL
ALTER TABLE dbo.Profiles ADD Discoverable bit NOT NULL CONSTRAINT DF_Profiles_Discoverable DEFAULT 1;
