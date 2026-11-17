# AL3 Photography: site + admin

Zero dependencies. Needs Node 18+.

## Run it on your computer
    ADMIN_PASSWORD="choose-a-long-password" node server.js
    (Windows PowerShell:  $env:ADMIN_PASSWORD="choose-a-long-password"; node server.js)

Site:  http://localhost:3000        Admin:  http://localhost:3000/admin

## Using the admin
- Gallery: drop photos on the top box to add them. Drag cards to reorder.
  Drop an image file onto a card to swap its photo. Click a card to edit title, category,
  camera/lens/ISO/exposure, or delete it.
- Stories: "+ New essay", fill in the details, write the text. Blank line = new paragraph,
  a line starting with "## " = heading. Drop an image onto the text box to insert a photo
  at the cursor. Drag rows to reorder.
- Homepage: banner image/text and the About section.
- Nothing goes live until you press "Save changes".
- Photos are resized to max 2400px in the browser before upload, so the site stays fast.

## Where things are stored (important for hosting)
Everything the admin changes lives in DATA_DIR (default ./data): content.json and uploads/.
On a host, DATA_DIR must be on a PERSISTENT DISK, otherwise edits and uploads disappear
when the app restarts or redeploys.

## Deploying
Use a host that runs a Node app AND offers a persistent disk/volume:
Render (Web Service + Disk), Railway (Volume), Fly.io (Volume), or a cheap VPS.
Settings: start command `node server.js`; env vars ADMIN_PASSWORD and DATA_DIR (path of the mounted disk).
Use HTTPS (these hosts do it automatically) so the login cookie is protected.
Netlify drag-and-drop and GitHub Pages will NOT work for this version: they can't save changes.

## Files
server.js    server, login, uploads, saving
seed.json    starting content (copied to DATA_DIR on first run)
public/      index.html, story.html, admin.html, css/, js/, assets/
