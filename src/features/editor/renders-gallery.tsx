import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Play, 
  Calendar, 
  FileVideo, 
  RefreshCw
} from "lucide-react";
import { download } from "@/utils/download";
import { toast } from "sonner";

interface Render {
  id: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  downloadUrl: string;
}

interface RendersGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RendersGallery = ({ open, onOpenChange }: RendersGalleryProps) => {
  const [renders, setRenders] = useState<Render[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRenders = async () => {
    setLoading(true);
    try {
      // Universal access: no session headers needed
      const response = await fetch('/api/render/list');
      
      if (response.ok) {
        const data = await response.json();
        setRenders(data.renders || []);
        console.log(`[renders-gallery] Loaded ${data.renders?.length || 0} renders (universal access)`);
      } else {
        const errorText = await response.text();
        console.error(`[renders-gallery] Failed to load renders - ${response.status}: ${response.statusText}`);
        console.error(`[renders-gallery] Error details:`, errorText);
        toast.error(`Failed to load renders: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch renders:', error);
      toast.error('Failed to load renders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRenders();
    }
  }, [open]);

  const handleDownload = async (render: Render) => {
    try {
      // Clean filename for download
      const cleanFilename = `video_${render.id.replace('export_', '')}`;
      await download(render.downloadUrl, cleanFilename);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const handlePreview = (render: Render) => {
    // Universal access: no session needed for preview
    const previewUrl = `${render.downloadUrl}&preview=true`;
    console.log(`[renders-gallery] Opening preview for ${render.filename}`);
    window.open(previewUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileVideo className="h-5 w-5" />
            Your Rendered Videos
            {renders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {renders.length} video{renders.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${renders.length} videos available`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRenders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : renders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <FileVideo className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No rendered videos found</p>
              <p className="text-sm text-muted-foreground">
                Create your first video by clicking Export in the navbar
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {renders.map((render) => (
                <Card
                  key={render.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileVideo className="h-4 w-4 text-primary" />
                          <h3 className="font-medium truncate">
                            Video Export
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            MP4
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(render.createdAt)}
                          </div>
                          <div>{formatFileSize(render.size)}</div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {render.filename}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(render);
                          }}
                          className="h-8 w-8 p-0"
                          title="Preview video"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(render);
                          }}
                          className="h-8 w-8 p-0"
                          title="Download video"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};