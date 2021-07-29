const tripstable = `
    CREATE TABLE if not exists trips (
        tripId INT UNSIGNED NOT NULL AUTO_INCREMENT,
        id INT UNSIGNED NOT NULL,
        region VARCHAR(20) NOT NULL,
        city VARCHAR(20) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        tripInfo VARCHAR(500) NULL DEFAULT NULL,
        partner VARCHAR(20) NOT NULL DEFAULT 'anonymous',
        PRIMARY KEY (tripId),
        INDEX fk_trips_users1_idx (id ASC) VISIBLE,
        CONSTRAINT fk_trips_users1
          FOREIGN KEY (id)
          REFERENCES HANG.users (id)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION)`;
export default tripstable;
