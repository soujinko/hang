const trips = `CREATE TABLE if not exists trips (tripId INT UNSIGNED NOT NULL AUTO_INCREMENT,userPk INT UNSIGNED NOT NULL,region VARCHAR(20) NOT NULL,city VARCHAR(20) NOT NULL,startDate DATE NOT NULL,endDate DATE NOT NULL,tripInfo VARCHAR(500) NOT NULL,partner INT DEFAULT NULL,tags VARCHAR(8) DEFAULT '0',PRIMARY KEY (tripId),INDEX fk_trips_users1_idx (userPk ASC) VISIBLE,CONSTRAINT fk_trips_users1 FOREIGN KEY (userPk) REFERENCES hang.users (userPk) ON DELETE CASCADE ON UPDATE NO ACTION) ENGINE = InnoDB;`;

export default trips;
