import mongoose from 'mongoose';

const coordinatesSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: true,
      min: 0,
    },
    y: {
      type: Number,
      required: true,
      min: 0,
    },
    client_x: {
      type: Number,
      default: undefined,
    },
    client_y: {
      type: Number,
      default: undefined,
    },
  },
  { _id: false }
);

const viewportSchema = new mongoose.Schema(
  {
    width: {
      type: Number,
      min: 0,
    },
    height: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const elementRectSchema = new mongoose.Schema(
  {
    top: { type: Number, default: 0 },
    left: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false }
);

const elementSchema = new mongoose.Schema(
  {
    tag: { type: String, trim: true, default: '' },
    id: { type: String, trim: true, default: '' },
    classes: { type: String, trim: true, default: '' },
    text: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    href: { type: String, trim: true, default: '' },
    rect: { type: elementRectSchema, default: null },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    site_id: {
      type: String,
      required: [true, 'site_id is required'],
      default: 'cf_demo_site',
      lowercase: true,
      trim: true,
      index: true,
    },
    session_id: {
      type: String,
      required: [true, 'session_id is required'],
      trim: true,
      index: true,
    },
    event_type: {
      type: String,
      required: [true, 'event_type is required'],
      enum: {
        values: ['page_view', 'click'],
        message: '{VALUE} is not a valid event_type. Must be "page_view" or "click"',
      },
    },
    page_url: {
      type: String,
      required: [true, 'page_url is required'],
      trim: true,
    },
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
      default: Date.now,
    },
    coordinates: {
      type: coordinatesSchema,
      default: null,
      validate: {
        validator: function (val) {
          // If click event, coordinates must be provided with valid numbers
          if (this.event_type === 'click') {
            return val !== null && val !== undefined && typeof val.x === 'number' && typeof val.y === 'number';
          }
          // If page_view, coordinates can be null or undefined
          return true;
        },
        message: 'Coordinates { x: number, y: number } are required for click events',
      },
    },
    viewport: {
      type: viewportSchema,
      default: null,
    },
    // Full scrollable document dimensions at the moment of the click.
    // Used by the heatmap overlay to compute correct scale factors:
    //   scaleX = previewWidth / doc_width,  renderedX = originalX * scaleX
    doc_width: {
      type: Number,
      min: 0,
      default: null,
    },
    doc_height: {
      type: Number,
      min: 0,
      default: null,
    },
    scroll_x: {
      type: Number,
      default: 0,
    },
    scroll_y: {
      type: Number,
      default: 0,
    },
    element: {
      type: elementSchema,
      default: null,
    },
    is_fixed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for multi-tenant and single-site high-throughput lookups
// 1. Session-specific event history ordered chronologically
eventSchema.index({ site_id: 1, session_id: 1, timestamp: 1 });
eventSchema.index({ session_id: 1, timestamp: 1 });

// 2. Global activity and recent session sorting
eventSchema.index({ site_id: 1, timestamp: -1 });
eventSchema.index({ timestamp: -1 });

// 3. Page-specific click queries for heatmaps
eventSchema.index({ site_id: 1, page_url: 1, event_type: 1 });
eventSchema.index({ page_url: 1, event_type: 1 });

// 4. Scoped event type filtering
eventSchema.index({ site_id: 1, event_type: 1, timestamp: -1 });

// Clean JSON transform for API responses
eventSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
