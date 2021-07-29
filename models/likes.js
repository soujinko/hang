const likes = `
  CREATE TABLE if not exists likes (
    targetPk VARCHAR(20) NOT NULL,
    userPk INT UNSIGNED NOT NULL,
      INDEX fk_likes_users_idx (id ASC) VISIBLE,
      CONSTRAINT fk_likes_users
      FOREIGN KEY (id)
      REFERENCES HANG.users (id)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION)`;

export default likes;
