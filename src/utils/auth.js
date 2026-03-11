export const verifyToken = (req) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new Error("Token missing");
  }

  const token = authHeader.split(" ")[1];

  if (token !== "123456") {
    throw new Error("Invalid Token");
  }

};