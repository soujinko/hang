const alarmstable = `
CREATE TABLE if not exists alarms (
    requestId INT UNSIGNED NOT NULL,
    checked TINYINT NULL DEFAULT 0,
    INDEX fk_alarms_requests1_idx (requestId ASC) VISIBLE,
    CONSTRAINT fk_alarms_requests1
      FOREIGN KEY (requestId)
      REFERENCES HANG.requests (requestId)
      ON DELETE CASCADE
      ON UPDATE NO ACTION)`;
export default alarmstable;
