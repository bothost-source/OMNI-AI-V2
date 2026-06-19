/**
 * OMNI Website Deployment Guide
 * Complete step-by-step instructions for free hosting platforms
 */

function getDeploymentGuide(projectName = 'your-website') {
  return `
🚀 *DEPLOY YOUR WEBSITE FOR FREE*

Choose any of these platforms. All are FREE:

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 1: VERCEL (Easiest)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New Project"
4. Import from GitHub OR drag & drop your HTML file
5. Click "Deploy"
6. Done! Your site is live in 30 seconds

🔗 Live URL: https://${projectName}-random.vercel.app

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 2: NETLIFY (Drag & Drop)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://app.netlify.com/drop
2. Drag your HTML file into the box
3. Done! Instant live URL

🔗 Live URL: https://random-name.netlify.app

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 3: GITHUB PAGES (Permanent)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://github.com/new
2. Create repo: ${projectName}
3. Upload your HTML file (name it index.html)
4. Go to Settings → Pages
5. Source: Deploy from branch → main
6. Done! Your site is live

🔗 Live URL: https://yourusername.github.io/${projectName}

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 4: SURGE.SH (Command Line)
━━━━━━━━━━━━━━━━━━━━━━
1. Install: npm install -g surge
2. Run: surge (in your project folder)
3. Follow prompts
4. Done! Custom domain available

🔗 Live URL: https://${projectName}.surge.sh

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 5: RENDER (Full Stack)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://render.com
2. Sign up with GitHub
3. New → Static Site
4. Connect your GitHub repo
5. Build command: (leave empty)
6. Publish directory: /
7. Click "Create Static Site"

🔗 Live URL: https://${projectName}.onrender.com

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 6: CLOUDFLARE PAGES
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://dash.cloudflare.com
2. Pages → Create a project
3. Upload your HTML file
4. Done! Fastest CDN worldwide

🔗 Live URL: https://${projectName}.pages.dev

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 7: TIINY HOST (Simplest)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://tiiny.host
2. Upload your ZIP file
3. Enter site name
4. Done! No signup needed

🔗 Live URL: https://${projectName}.tiiny.site

━━━━━━━━━━━━━━━━━━━━━━
📌 OPTION 8: 000WEBHOST (PHP + MySQL)
━━━━━━━━━━━━━━━━━━━━━━
1. Go to https://www.000webhost.com
2. Sign up for free
3. File Manager → Upload
4. Upload your HTML file
5. Visit your site

🔗 Live URL: https://${projectName}.000webhostapp.com

━━━━━━━━━━━━━━━━━━━━━━

💡 *PRO TIP:* For the fastest setup, use **Netlify Drop** (Option 2) — just drag and drop, no account needed for basic hosting!

📁 *Your file is ready.* Download it above and follow any option.

❓ Need help? Reply "deploy help" and I'll guide you step by step.
`;
}

function getCustomDomainGuide() {
  return `
🌐 *CUSTOM DOMAIN SETUP*

Already bought a domain? Here's how to connect it:

1. Buy domain from: Namecheap, GoDaddy, or Cloudflare
2. In your hosting platform (Vercel/Netlify):
   → Settings → Domains → Add Custom Domain
3. Copy the DNS records they give you
4. Go to your domain registrar
5. Add those DNS records (usually CNAME or A records)
6. Wait 5-48 hours for propagation
7. Done! Your domain is live

🔒 *FREE SSL:* All platforms above give free HTTPS automatically!
`;
}

module.exports = {
  getDeploymentGuide,
  getCustomDomainGuide
};
