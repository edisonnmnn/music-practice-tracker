const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.set('port', process.env.PORT || 3000);

app.use((req, res, next) => {
    console.log(`${req.method} request for ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/submit-form', (req, res) => {
    res.send('Form submitted');
});

const port = app.get('port');
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});