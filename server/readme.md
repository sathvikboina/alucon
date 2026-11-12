# AlumniConnect server

The API runs on Node.js 22 (see `.nvmrc`). Full setup instructions, including
MongoDB, the environment template and the demo seed, live in the repository's
root `README.md`.

```bash
npm install
npm run server   # nodemon, development
npm start        # plain node
npm run seed     # refresh demo data and rebuild the search index
npm test         # all server suites (node:test; see server/tests)
npm run search:index  # rebuild the unified BGE search index
```
