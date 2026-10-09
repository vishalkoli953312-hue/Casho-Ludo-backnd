import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req, res) {
  const { matchId, publicId } = req.query;

  // 1. मैच वीडियो सर्च करना (GET)
  if (req.method === 'GET') {
    if (!matchId) return res.status(400).json({ error: 'matchId आवश्यक है' });

    try {
      const resource = await cloudinary.api.resource(`ludo_matches/match_${matchId}`, {
        resource_type: 'video',
        context: true,
      });

      return res.status(200).json({
        success: true,
        data: {
          url: resource.secure_url,
          public_id: resource.public_id,
          format: resource.format,
          duration: resource.duration,
          created_at: resource.created_at,
          metadata: resource.context ? resource.context.custom : {},
        },
      });
    } catch (err) {
      return res.status(404).json({ error: 'इस Match ID का वीडियो उपलब्ध नहीं है।' });
    }
  }

  // 2. वीडियो डिलीट करना (DELETE)
  if (req.method === 'DELETE') {
    if (!publicId) return res.status(400).json({ error: 'publicId आवश्यक है' });

    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      return res.status(200).json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}