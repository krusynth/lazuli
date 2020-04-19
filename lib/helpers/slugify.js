function slugify(name) {
  return name.toLowerCase()
    // Replace special characters
    .replace(/([^a-z0-9-\.]+)/g, '-')
    // Remove trailing dashes
    .replace(/^-+/, '')
    // Remove front dashes
    .replace(/-+$/, '');
}

module.exports = slugify;