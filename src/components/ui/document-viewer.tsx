import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, X, ExternalLink, Image, File, FileQuestion, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
}

export function DocumentViewer({ open, onOpenChange, documentUrl, documentName }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  
  const fileExtension = documentName.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '');
  const isPdf = fileExtension === 'pdf';
  const isDoc = ['doc', 'docx'].includes(fileExtension || '');
  const isExcel = ['xls', 'xlsx'].includes(fileExtension || '');
  const isPowerPoint = ['ppt', 'pptx'].includes(fileExtension || '');
  const isText = ['txt', 'csv'].includes(fileExtension || '');

  // Reset zoom and rotation when document changes
  useEffect(() => {
    if (open) {
      setImageZoom(1);
      setImageRotation(0);
      setLoading(true);
      setPdfError(false);
    }
  }, [open, documentUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(documentUrl, '_blank');
  };

  const getFileTypeIcon = () => {
    if (isImage) return <Image className="h-5 w-5" />;
    if (isPdf) return <FileText className="h-5 w-5" />;
    if (isDoc) return <FileText className="h-5 w-5" />;
    if (isExcel) return <FileText className="h-5 w-5" />;
    if (isPowerPoint) return <FileText className="h-5 w-5" />;
    return <FileQuestion className="h-5 w-5" />;
  };

  const getFileTypeBadge = () => {
    if (isImage) return <Badge variant="secondary">IMAGE</Badge>;
    if (isPdf) return <Badge variant="secondary">PDF</Badge>;
    if (isDoc) return <Badge variant="secondary">DOC</Badge>;
    if (isExcel) return <Badge variant="secondary">EXCEL</Badge>;
    if (isPowerPoint) return <Badge variant="secondary">PPT</Badge>;
    if (isText) return <Badge variant="secondary">TEXT</Badge>;
    return <Badge variant="secondary">{fileExtension?.toUpperCase()}</Badge>;
  };

  const zoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  const rotate = () => setImageRotation(prev => (prev + 90) % 360);
  const resetImage = () => {
    setImageZoom(1);
    setImageRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] sm:h-[80vh] flex flex-col p-0 sm:p-6">
        <DialogHeader className="px-4 sm:px-0 pt-4 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getFileTypeIcon()}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base sm:text-lg truncate">
                    {documentName}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    {getFileTypeBadge()}
                    <span className="text-xs">Preview and download the document</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {isImage && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    disabled={imageZoom <= 0.5}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium px-2 min-w-[45px] text-center">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    disabled={imageZoom >= 3}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rotate}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-2 h-9"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Open</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gap-2 h-9"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted/20 relative m-4 sm:m-0 sm:mt-4">
          {loading && !pdfError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}
          
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <div 
                className="transition-transform duration-200 ease-in-out"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                }}
              >
                <img
                  src={documentUrl}
                  alt={documentName}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                />
              </div>
            </div>
          ) : isPdf ? (
            pdfError ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6 sm:p-8">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <div className="text-center space-y-3">
                  <p className="text-sm font-medium">PDF Preview Unavailable</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Some browsers don't support inline PDF viewing. Please open in a new tab or download the file.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
                  <Button 
                    onClick={handleOpenInNewTab} 
                    variant="outline" 
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            ) : (
              <iframe
                src={`${documentUrl}#toolbar=0&view=fitH`}
                className="w-full h-full border-0"
                title={documentName}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setPdfError(true);
                }}
              />
            )
          ) : isDoc || isExcel || isPowerPoint ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 sm:p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-3">
                <p className="text-sm font-medium">
                  {isDoc ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : 'PowerPoint Presentation'}
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  {fileExtension?.toUpperCase()} files cannot be previewed in the browser.
                  Please download to view in Microsoft Office or compatible software.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
                <Button 
                  onClick={handleOpenInNewTab} 
                  variant="outline" 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open File
                </Button>
                <Button 
                  onClick={handleDownload} 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Download {fileExtension?.toUpperCase()}
                </Button>
              </div>
            </div>
          ) : isText ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 sm:p-8">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-3">
                <p className="text-sm font-medium">Text Document</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Text files are best viewed by downloading and opening in a text editor.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
                <Button 
                  onClick={handleOpenInNewTab} 
                  variant="outline" 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Text
                </Button>
                <Button 
                  onClick={handleDownload} 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Download TXT
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 sm:p-8">
              <FileQuestion className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-3">
                <p className="text-sm font-medium">Unsupported File Type</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  This file type (.{fileExtension}) cannot be previewed in the browser.
                  Please download the file to view it.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4">
                <Button 
                  onClick={handleOpenInNewTab} 
                  variant="outline" 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4" />
                  Try Opening
                </Button>
                <Button 
                  onClick={handleDownload} 
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
              </div>
            </div>
          )}

          {/* Image Controls Overlay */}
          {isImage && !loading && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border">
              <div className="flex items-center gap-3 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  disabled={imageZoom <= 0.5}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="font-medium min-w-[40px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  disabled={imageZoom >= 3}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <div className="h-4 w-px bg-border"></div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotate}
                  className="h-7 w-7 p-0"
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImage}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
