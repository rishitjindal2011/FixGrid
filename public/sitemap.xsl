<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap — FixGrid</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <style type="text/css">
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Public Sans", sans-serif;
            color: #123b4a;
            background: #f8fafc;
            padding: 32px 16px;
            font-size: 14px;
            line-height: 1.5;
          }
          .container {
            max-width: 1080px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(18, 59, 74, 0.08);
            border: 1px border #e2e8f0;
            overflow: hidden;
          }
          header {
            padding: 28px 32px;
            background: linear-gradient(135deg, #0284c7 0%, #0f3d4c 50%, #ea580c 100%);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-box {
            width: 40px;
            height: 40px;
            background: #ffffff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          .title-area h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
          }
          .title-area p {
            font-size: 13px;
            opacity: 0.9;
            margin-top: 2px;
          }
          .badge-count {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            color: #ffffff;
          }
          .info-banner {
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            padding: 14px 32px;
            font-size: 13px;
            color: #475569;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
          }
          .info-banner a {
            color: #0284c7;
            text-decoration: none;
            font-weight: 600;
          }
          .info-banner a:hover {
            text-decoration: underline;
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          th {
            background: #f8fafc;
            color: #334155;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 14px 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 14px 20px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
            font-size: 13px;
          }
          tr:nth-child(even) td {
            background: #fafbfc;
          }
          tr:hover td {
            background: #f0f9ff;
          }
          td a {
            color: #0284c7;
            text-decoration: none;
            word-break: break-all;
            font-weight: 500;
          }
          td a:hover {
            text-decoration: underline;
            color: #0369a1;
          }
          .priority-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11px;
            font-family: ui-monospace, monospace;
            background: #e0f2fe;
            color: #0369a1;
          }
          .priority-pill.high {
            background: #ffedd5;
            color: #c2410c;
          }
          .frequency-pill {
            text-transform: capitalize;
            color: #64748b;
            font-size: 12px;
          }
          .date-cell {
            color: #64748b;
            font-family: ui-monospace, monospace;
            font-size: 12px;
            white-space: nowrap;
          }
          footer {
            padding: 20px 32px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div class="brand">
              <div class="logo-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
              </div>
              <div class="title-area">
                <h1>FixGrid XML Sitemap</h1>
                <p>Verified Local Repair Network &amp; Directory in India</p>
              </div>
            </div>
            <div class="badge-count">
              <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs Indexed
            </div>
          </header>

          <div class="info-banner">
            <div>This XML sitemap is consumed by Googlebot, Bing, and major search engines for automated indexing.</div>
            <div>Return to <a href="https://fixgrid.vytron.me">fixgrid.vytron.me</a></div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>URL</th>
                  <th style="width: 120px;">Priority</th>
                  <th style="width: 130px;">Change Freq</th>
                  <th style="width: 170px;">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td style="color: #94a3b8; font-family: ui-monospace, monospace;">
                      <xsl:value-of select="position()"/>
                    </td>
                    <td>
                      <xsl:variable name="itemURL">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:variable>
                      <a href="{$itemURL}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <span class="priority-pill">
                        <xsl:if test="sitemap:priority &gt;= 0.9">
                          <xsl:attribute name="class">priority-pill high</xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>
                    <td>
                      <span class="frequency-pill">
                        <xsl:value-of select="sitemap:changefreq"/>
                      </span>
                    </td>
                    <td class="date-cell">
                      <xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)))"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <footer>
            Generated automatically for search engines by FixGrid (by Vytron).
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
