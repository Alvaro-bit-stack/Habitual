-- Friends (by shareable code), cached Gemini mastery paths, and a per-user daily AI budget.
IF OBJECT_ID('dbo.Profiles') IS NULL
CREATE TABLE dbo.Profiles (
  UserId varchar(64) NOT NULL PRIMARY KEY,
  Code char(8) NOT NULL UNIQUE,
  Name nvarchar(100) NOT NULL,
  Character varchar(20) NULL,
  Xp int NOT NULL DEFAULT 0,
  UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.Friendships') IS NULL
CREATE TABLE dbo.Friendships (
  UserA varchar(64) NOT NULL REFERENCES dbo.Profiles(UserId),  -- UserA < UserB, so a pair is stored once
  UserB varchar(64) NOT NULL REFERENCES dbo.Profiles(UserId),
  RequestedBy varchar(64) NOT NULL,
  Accepted bit NOT NULL DEFAULT 0,
  CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (UserA, UserB),
  CHECK (UserA < UserB)
);
IF OBJECT_ID('dbo.PathCache') IS NULL
CREATE TABLE dbo.PathCache (
  CacheKey varchar(80) NOT NULL PRIMARY KEY,
  Payload nvarchar(max) NOT NULL CHECK (ISJSON(Payload)=1),
  CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.AiUsage') IS NULL
CREATE TABLE dbo.AiUsage (
  UserId varchar(64) NOT NULL,
  Day date NOT NULL,
  Calls int NOT NULL,
  PRIMARY KEY (UserId, Day)
);
