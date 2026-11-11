# AlumniConnect server

The API runs on Node.js 22 (see `.nvmrc`). Full setup instructions, including
MongoDB, the environment template and the demo seed, live in the repository's
root `README.md`.

```bash
npm install
npm run server   # nodemon, development
npm start        # plain node
npm run seed     # refresh demo data and rebuild the search index
npm test         # matching, email queue, security, AI insights and search tests
npm run search:index  # rebuild the unified BGE search index
```
