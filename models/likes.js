const likes = `CREATE TABLE if not exists likes (targetPk VARCHAR(20) NOT NULL,userPk INT UNSIGNED NOT NULL,INDEX fk_likes_users_idx (userPk ASC) VISIBLE,CONSTRAINT fk_likes_users FOREIGN KEY (userPk) REFERENCES hang.users (userPk) ON DELETE CASCADE ON UPDATE NO ACTION) ENGINE = InnoDB;`;

export default likes;
