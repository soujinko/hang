const users = `
  CREATE TABLE if not exists users (
    userPk INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nickname VARCHAR(20) NOT NULL,
    userId VARCHAR(20) NOT NULL,
    password CHAR(88) NOT NULL,
    salt CHAR(88) NULL,
    refreshToken CHAR(171) NULL,
    region VARCHAR(20) NOT NULL,
    city VARCHAR(20) NOT NULL,
    age CHAR(2) NOT NULL,
    guide TINYINT UNSIGNED NULL DEFAULT NULL,
    profileImg VARCHAR(225) NOT NULL DEFAULT '',
      UNIQUE INDEX nickname_UNIQUE (nickname ASC) VISIBLE,
      UNIQUE INDEX userId_UNIQUE (userId ASC) VISIBLE,
      PRIMARY KEY (id));`;

export default users;
