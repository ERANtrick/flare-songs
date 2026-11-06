require "json"
require_relative "pages-network"
require "github-pages"

source, destination, report = ARGV
abort "Expected source, destination, report" unless report
config = Jekyll.configuration(
  "source" => File.expand_path(source),
  "destination" => File.expand_path(destination),
  "baseurl" => "/flare-songs",
  "url" => "https://erantrick.github.io",
  "repository" => "ERANtrick/flare-songs",
  "title" => "flare-songs",
  "description" => "",
  # Explicit public metadata avoids depending on GitHub API credentials or network.
  "github" => {
    "repository_url" => "https://github.com/ERANtrick/flare-songs",
    "repository_name" => "flare-songs",
    "repository_nwo" => "ERANtrick/flare-songs",
    "owner_name" => "ERANtrick",
    "owner_url" => "https://github.com/ERANtrick",
    "is_project_page" => true,
    "is_user_page" => false,
    "public" => true
  }
)
site = Jekyll::Site.new(config)
# The pinned metadata plugin otherwise probes DNS and queries GitHub while
# rendering the license Markdown. This test supplies public metadata locally.
# Its offline mode preserves the actual Pages plugins/theme/rendering pipeline.
Jekyll::GitHubMetadata.client.instance_variable_set(:@internet_connected, false)
site.process
defaults = Jekyll::Configuration::DEFAULTS["exclude"]
if File.exist?(File.join(source, "_config.yml"))
  excluded = site.config["exclude"]
  missing = defaults.reject { |value| excluded.include?(value) }
  abort "Jekyll default exclusions lost: #{missing.inspect}" unless missing.empty?
  abort "Maintenance exclusion missing" unless excluded.include?("_maintenance/")
end
File.write(report, JSON.pretty_generate({
  ruby: RUBY_VERSION, github_pages: GitHubPages::VERSION,
  jekyll: Jekyll::VERSION, source: source, destination: destination,
  excludes: site.config["exclude"], default_excludes: defaults,
  plugins: site.config["plugins"], safe: site.config["safe"], baseurl: site.config["baseurl"],
  networking: "offline; Ruby bind/listen/connect rejected"
}))
