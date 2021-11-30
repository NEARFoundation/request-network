const {
  API_USER_NAME,
  API_USER_PASSWORD,
} = process.env;

module.exports = {
  authorization: Buffer.from(`${API_USER_NAME}:${API_USER_PASSWORD}`).toString('base64')
};
