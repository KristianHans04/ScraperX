import { Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Scrapifie uses a dark theme optimized for extended use. Theme customization coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
