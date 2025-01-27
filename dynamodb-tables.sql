-- Documents Table
CREATE TABLE Documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    text TEXT,
    folders JSON NOT NULL, -- Stores nested folder structure with resources
    dateAdded TEXT NOT NULL,
    lastOpened TEXT,
    tags JSON DEFAULT '[]',
    ownerID TEXT NOT NULL,
    updatedAt TEXT
);

-- Resources Table (stores actual content)
CREATE TABLE Resources (
    id TEXT PRIMARY KEY, -- Same as hash in ResourceMeta
    markdown TEXT,
    url TEXT NOT NULL,
    updatedAt TEXT
);

-- Resource Metadata Table
CREATE TABLE ResourceMeta (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL, -- Links to Resources.id
    name TEXT NOT NULL,
    dateAdded TEXT NOT NULL,
    lastOpened TEXT,
    notes TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    tags JSON DEFAULT '[]',
    documentId TEXT NOT NULL,
    fileType TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY (documentId) REFERENCES Documents(id),
    FOREIGN KEY (hash) REFERENCES Resources(id)
);

-- Users Table
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    image TEXT,
    accountCreated TEXT NOT NULL,
    lastLoggedIn TEXT,
    updatedAt TEXT
);

-- Local Login Users Table
CREATE TABLE LocalLoginUsers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    updatedAt TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_resourcemeta_document ON ResourceMeta(documentId);
CREATE INDEX idx_resourcemeta_hash ON ResourceMeta(hash);
CREATE INDEX idx_documents_owner ON Documents(ownerID);
CREATE INDEX idx_users_email ON Users(email);

-- Create triggers to maintain updatedAt
CREATE TRIGGER update_documents_timestamp 
AFTER UPDATE ON Documents
BEGIN
    UPDATE Documents SET updatedAt = DATETIME('now') 
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_resources_timestamp
AFTER UPDATE ON Resources
BEGIN
    UPDATE Resources SET updatedAt = DATETIME('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_resourcemeta_timestamp
AFTER UPDATE ON ResourceMeta
BEGIN
    UPDATE ResourceMeta SET updatedAt = DATETIME('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON Users
BEGIN
    UPDATE Users SET updatedAt = DATETIME('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_localloginusers_timestamp
AFTER UPDATE ON LocalLoginUsers
BEGIN
    UPDATE LocalLoginUsers SET updatedAt = DATETIME('now')
    WHERE id = NEW.id;
END;
