import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'lottin_films_secret_key_12345';

export const authenticateToken = (req) => {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.admin_token;

  if (!token) return null;

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (err) {
    return null;
  }
};
