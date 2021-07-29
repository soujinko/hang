const requests = `
  CREATE TABLE if not exists requests (
    requestId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tripId INT UNSIGNED NOT NULL,
    reqId VARCHAR(20) NOT NULL,
    recId VARCHAR(20) NOT NULL,
    status TINYINT NULL DEFAULT 1,
    refCnt INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (requestId),
    INDEX fk_requests_trips1_idx (tripId ASC) VISIBLE,
    CONSTRAINT fk_requests_trips1
      FOREIGN KEY (tripId)
      REFERENCES HANG.trips (tripId)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION)`;

export default requests;
