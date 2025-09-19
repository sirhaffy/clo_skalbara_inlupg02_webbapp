const express = require('express');
const os = require('os');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <body>
      <h1>CLO FreSva</h1>
      <p>Hoppla.</p>
      <p><strong>Denna körs på server:</strong> ${os.hostname()}</p>
      <p><strong>Container ID:</strong> ${process.env.HOSTNAME || 'Unknown'}</p>
      <p><strong>Tid:</strong> ${new Date().toISOString()}</p>
      <p><strong>Platform:</strong> ${os.platform()}</p>
    </body>
    </html>
  `);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`App running on port ${port}`);
});