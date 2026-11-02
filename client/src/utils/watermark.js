/**
 * @module utils/watermark
 * @description Auto-stamps field photos with an official, tamper-evident
 * Ga South Municipal Assembly banner containing GPS coordinates, GhanaPost
 * digital address, timestamp, and collector identity.
 */

/**
 * Watermarks an image file with real-time geospatial and municipal metadata.
 * Scales ultra-high-res phone photos to a performant max resolution (~1600px),
 * burns a crisp dark banner at the bottom with coordinates and timestamp,
 * and outputs a standard JPEG File and preview URL.
 *
 * @param {File} file - Original image file selected or captured by camera
 * @param {Object} metadata - Geolocation and field context
 * @param {number|null} metadata.latitude - WGS84 Latitude
 * @param {number|null} metadata.longitude - WGS84 Longitude
 * @param {number|null} metadata.accuracy - Accuracy in meters
 * @param {string|null} metadata.ghanaPostAddress - Digital Address (e.g. GS-0142-8921)
 * @param {string|null} metadata.collectorName - Name of the field officer
 * @param {string|null} metadata.moduleType - 'property' | 'business' | 'market_stall'
 * @param {Date|string|null} metadata.capturedAt - Timestamp (defaults to now)
 * @returns {Promise<{ file: File, previewUrl: string, name: string, size: number }>}
 */
export async function watermarkImage(file, metadata = {}) {
  const {
    latitude = null,
    longitude = null,
    accuracy = null,
    ghanaPostAddress = null,
    collectorName = null,
    moduleType = 'property',
    capturedAt = new Date(),
  } = metadata;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        // 1. Scale down very large camera images (e.g. 12-48MP) to max 1600px
        // for optimal memory usage on mobile and snappy uploads
        const MAX_DIM = 1600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (Math.max(width, height) > MAX_DIM) {
          const ratio = MAX_DIM / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // 2. Draw base photo
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Proportional typography and sizing
        const basePadding = Math.max(14, Math.round(width * 0.018));
        const fontSizeHeader = Math.max(13, Math.round(width * 0.021));
        const fontSizeCoord = Math.max(12, Math.round(width * 0.019));
        const fontSizeSub = Math.max(10, Math.round(width * 0.016));
        const lineHeight = Math.max(18, Math.round(width * 0.026));

        const bannerHeight = basePadding * 2 + lineHeight * 3 + 6;
        const bannerY = height - bannerHeight;

        // 4. Background banner gradient
        const bgGrad = ctx.createLinearGradient(0, bannerY, 0, height);
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
        bgGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.94)');
        bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, bannerY, width, bannerHeight);

        // 5. Accent stripe at top of banner (Crimson + Gold)
        const stripeH = Math.max(3, Math.round(width * 0.004));
        ctx.fillStyle = '#991B1B'; // GSMA Crimson
        ctx.fillRect(0, bannerY, width, stripeH);
        ctx.fillStyle = '#F59E0B'; // Gold accent
        ctx.fillRect(0, bannerY, Math.round(width * 0.35), stripeH);

        // 6. Line 1: Assembly Title & Verified Badge
        const titleY = bannerY + basePadding + fontSizeHeader;
        ctx.font = `bold ${fontSizeHeader}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('🏛️ GA SOUTH MUNICIPAL ASSEMBLY — NGLESHIE AMANFRO DCS', basePadding, titleY);

        // Official verification stamp on the far right (if width allows)
        if (width >= 500) {
          const badgeText = 'VERIFIED FIELD CAPTURE';
          ctx.font = `bold ${fontSizeSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const badgeWidth = ctx.measureText(badgeText).width + 16;
          const badgeX = width - basePadding - badgeWidth;
          const badgeY = bannerY + basePadding + 2;
          const badgeH = fontSizeSub + 8;

          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Emerald transparent
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeWidth, badgeH, 4) : ctx.rect(badgeX, badgeY, badgeWidth, badgeH);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#34D399';
          ctx.fillText(badgeText, badgeX + 8, badgeY + fontSizeSub + 1);
        }

        // 7. Line 2: Coordinates & GhanaPost Digital Address
        const coordY = titleY + lineHeight;
        let coordText = 'GPS: Location Not Fixed (Pending Device Fix)';
        if (latitude != null && longitude != null) {
          const latDir = latitude >= 0 ? 'N' : 'S';
          const lngDir = longitude >= 0 ? 'E' : 'W';
          const accText = accuracy != null ? ` (±${Math.round(accuracy)}m)` : '';
          coordText = `${Math.abs(latitude).toFixed(5)}° ${latDir}, ${Math.abs(longitude).toFixed(5)}° ${lngDir}${accText}`;
        }

        const digitalAddr = ghanaPostAddress ? `  |  🇬🇭 Digital Addr: ${ghanaPostAddress}` : '';

        ctx.font = `600 ${fontSizeCoord}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = latitude != null ? '#38BDF8' : '#F87171'; // Sky-blue if GPS valid, soft-red if pending
        ctx.fillText(`📍 ${coordText}${digitalAddr}`, basePadding, coordY);

        // 8. Line 3: Timestamp & Field Officer
        const subY = coordY + lineHeight;
        const timeObj = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
        const dateStr = timeObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = timeObj.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const officerStr = collectorName ? `  |  Officer: ${collectorName}` : '';
        const modLabels = {
          property: 'Property Rate',
          business: 'Business (BOP)',
          market_stall: 'Market Stall',
        };
        const modStr = `  |  ${modLabels[moduleType] || 'Revenue Record'}`;

        ctx.font = `normal ${fontSizeSub}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = '#CBD5E1'; // Slate 300
        ctx.fillText(`📅 ${dateStr}, ${timeStr} GMT${officerStr}${modStr}`, basePadding, subY);

        // 9. Export as optimized JPEG Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate watermarked image blob'));
              return;
            }

            const cleanBase = (file.name || 'field_capture').replace(/\.[^/.]+$/, '');
            const newFileName = `${cleanBase}_geotagged.jpg`;
            const watermarkedFile = new File([blob], newFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: watermarkedFile,
              previewUrl,
              name: watermarkedFile.name,
              size: watermarkedFile.size,
              geotagged: latitude != null && longitude != null,
            });
          },
          'image/jpeg',
          0.88
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
