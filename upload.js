import { v2 as cloudinary } from 'cloudinary';
import Busboy from 'busboy';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return new Promise((resolve) => {
    const busboy = Busboy({ headers: req.headers });
    let matchId = '';
    let playersData = '{}';
    let uploadStream = null;
    let uploadPromise = null;

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'matchId') matchId = val;
      if (fieldname === 'players') playersData = val;
    });

    busboy.on('file', (fieldname, fileStream) => {
      if (fieldname === 'video') {
        uploadPromise = new Promise((resUpload, rejUpload) => {
          uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'video',
              folder: 'ludo_matches',
              public_id: `match_${matchId || Date.now()}`,
              tags: [matchId || 'unknown_match', 'ludo_match'],
              context: {
                matchId: matchId,
                players: playersData,
                uploadedAt: new Date().toISOString(),
              },
            },
            (error, result) => {
              if (error) rejUpload(error);
              else resUpload(result);
            }
          );
          fileStream.pipe(uploadStream);
        });
      } else {
        fileStream.resume();
      }
    });

    busboy.on('finish', async () => {
      try {
        if (!uploadPromise) {
          res.status(400).json({ error: 'No video stream provided.' });
          return resolve();
        }

        const result = await uploadPromise;
        res.status(200).json({
          success: true,
          secure_url: result.secure_url,
          public_id: result.public_id,
          matchId: matchId,
          duration: result.duration,
          format: result.format,
        });
        return resolve();
      } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: err.message || 'Cloudinary Stream Failed' });
        return resolve();
      }
    });

    busboy.on('error', (err) => {
      res.status(500).json({ error: 'Buffer pipeline error' });
      return resolve();
    });

    req.pipe(busboy);
  });
}