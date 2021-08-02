const auth =
  "CREATE TABLE if not exists auth (pNum CHAR(11) NOT NULL UNIQUE,aNum INT NOT NULL,time timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE INDEX pNum_UNIQUE (pNum ASC) VISIBLE) ENGINE = InnoDB;";

export default auth;
//
