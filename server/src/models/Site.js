import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    site_id: {
      type: String,
      required: [true, 'site_id is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_-]{3,50}$/, 'site_id must be between 3 and 50 characters, containing only letters, numbers, underscores, and hyphens'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [100, 'name cannot exceed 100 characters'],
    },
    domain: {
      type: String,
      required: [true, 'domain is required'],
      trim: true,
      maxlength: [200, 'domain cannot exceed 200 characters'],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

siteSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Site = mongoose.model('Site', siteSchema);

/**
 * Ensures the default demonstration website exists in the database.
 */
export async function ensureDefaultSite() {
  try {
    const existing = await Site.findOne({ site_id: 'cf_demo_site' });
    if (!existing) {
      await Site.create({
        site_id: 'cf_demo_site',
        name: 'ApexCloud Demo Website',
        domain: 'http://localhost:5173',
      });
      console.log('[MongoDB] Default website "cf_demo_site" created.');
    }
  } catch (err) {
    console.warn('[MongoDB] Default site verification note:', err.message);
  }
}

export default Site;
