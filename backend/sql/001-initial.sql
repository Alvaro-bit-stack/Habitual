IF OBJECT_ID('dbo.UserProgress') IS NULL
CREATE TABLE dbo.UserProgress (
  UserId varchar(64) NOT NULL PRIMARY KEY,
  Revision int NOT NULL,
  Payload nvarchar(max) NOT NULL CHECK (ISJSON(Payload)=1),
  UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
IF OBJECT_ID('dbo.Events') IS NULL
CREATE TABLE dbo.Events (
  Id uniqueidentifier NOT NULL PRIMARY KEY,
  HostId varchar(64) NOT NULL,
  HostName nvarchar(100) NOT NULL,
  HobbyId varchar(40) NOT NULL,
  Title nvarchar(200) NOT NULL,
  Place nvarchar(200) NOT NULL,
  Level nvarchar(40) NOT NULL,
  Spots int NOT NULL CHECK (Spots BETWEEN 2 AND 500),
  StartsAt datetimeoffset NOT NULL
);
IF OBJECT_ID('dbo.Attendance') IS NULL
CREATE TABLE dbo.Attendance (
  EventId uniqueidentifier NOT NULL REFERENCES dbo.Events(Id),
  UserId varchar(64) NOT NULL,
  JoinedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (EventId, UserId)
);
