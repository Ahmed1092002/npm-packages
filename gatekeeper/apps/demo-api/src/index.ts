import { createServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Gatekeeper Demo API listening on http://localhost:${PORT}`);
  console.log(`OpenAPI Swagger documentation available at http://localhost:${PORT}/api/docs`);
});
