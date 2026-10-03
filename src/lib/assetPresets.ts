export interface AssetPreset {
  id: string;
  name: string;
  category: 'industrial_machinery' | 'fleet_vehicle' | 'it_computing' | 'medical_lab' | 'facility_tooling';
  url: string;
  description: string;
}

export const ASSET_IMAGE_PRESETS: AssetPreset[] = [
  {
    id: 'preset-cnc',
    name: 'Precision 5-Axis CNC Milling Center',
    category: 'industrial_machinery',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    description: 'High-precision heavy machining center with telemetry sensors',
  },
  {
    id: 'preset-lathe',
    name: 'Industrial Robotic Automation Arm',
    category: 'industrial_machinery',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    description: 'Automated articulated arm for manufacturing and assembly',
  },
  {
    id: 'preset-fleet-truck',
    name: 'Heavy Duty Freight Logistics Transport',
    category: 'fleet_vehicle',
    url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80',
    description: 'Long-haul commercial transport with GPS telematics',
  },
  {
    id: 'preset-fleet-van',
    name: 'Electric Urban Delivery Van',
    category: 'fleet_vehicle',
    url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80',
    description: 'Zero-emission logistics van for field operations',
  },
  {
    id: 'preset-server-rack',
    name: 'High-Density Datacenter Server Rack',
    category: 'it_computing',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    description: 'Enterprise computing cluster with redundant cooling and dual UPS',
  },
  {
    id: 'preset-network-switch',
    name: 'Edge Industrial Computing Node',
    category: 'it_computing',
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
    description: 'Hardened edge switch for real-time SCADA telemetry',
  },
  {
    id: 'preset-lab-analyzer',
    name: 'Automated Clinical Diagnostic Analyzer',
    category: 'medical_lab',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    description: 'ISO 15189 calibrated bio-analytical testing system',
  },
  {
    id: 'preset-hvac-gen',
    name: 'Commercial HVAC & Backup Power Generator',
    category: 'facility_tooling',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    description: 'Facility backup generator and climate monitoring plant',
  },
];

export function getDefaultImageForCategory(category: string): string {
  const match = ASSET_IMAGE_PRESETS.find(p => p.category === category);
  return match ? match.url : ASSET_IMAGE_PRESETS[0].url;
}

/**
 * Resizes and compresses an uploaded file into a lightweight Base64 data URL
 * to avoid memory bloat and allow offline storage.
 */
export async function compressAndResizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
