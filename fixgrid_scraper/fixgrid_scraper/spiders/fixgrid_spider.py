import scrapy


class FixgridSpiderSpider(scrapy.Spider):
    name = "fixgrid_spider"
    allowed_domains = ["fixgrid.vytron.me"]
    start_urls = [
        "https://fixgrid.vytron.me",
        "https://fixgrid.vytron.me/search",
    ]

    def parse(self, response):
        self.logger.info(f"Crawling URL: {response.url}")

        # Extract page title and meta description
        yield {
            "page_url": response.url,
            "title": response.css("title::text").get(),
            "meta_description": response.css('meta[name="description"]::attr(content)').get(),
            "h1": response.css("h1::text").get(),
        }

        # Follow links on the same domain (e.g. shop pages, search filters)
        for link in response.css('a[href^="/"]::attr(href)').getall():
            if not any(ext in link for ext in [".png", ".jpg", ".jpeg", ".svg", ".ico"]):
                yield response.follow(link, callback=self.parse_page)

    def parse_page(self, response):
        yield {
            "page_url": response.url,
            "title": response.css("title::text").get(),
            "h1": response.css("h1::text").get(),
            "headings": [h.strip() for h in response.css("h2::text, h3::text").getall() if h.strip()],
        }
