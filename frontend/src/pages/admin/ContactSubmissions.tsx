import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, Trash2, Check, Search, RefreshCw, Inbox, MessageSquare } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { contactService } from '@/services/api';
import CustomButton from '@/components/ui/CustomButton';
import CustomCard from '@/components/ui/CustomCard';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ContactSubmission {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const ContactSubmissions = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewSubmissionDialog, setViewSubmissionDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [currentPage, filterRead]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await contactService.getContactSubmissions(currentPage, 10, filterRead);
      setSubmissions(response.data.submissions || []);
      setTotalPages(response.data.total_pages || 1);
    } catch (error: any) {
      console.error('Error fetching contact submissions:', error);
      let errorMessage = 'Failed to load contact submissions';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReadStatus = async (submission: ContactSubmission) => {
    try {
      await contactService.markSubmissionAsRead(submission._id, !submission.is_read);
      setSubmissions(prev =>
        prev.map(s => s._id === submission._id ? { ...s, is_read: !s.is_read } : s)
      );
      toast({ title: 'Success', description: `Marked as ${!submission.is_read ? 'read' : 'unread'}` });
    } catch (error: any) {
      let errorMessage = 'Failed to update submission status';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedSubmission) return;
    try {
      await contactService.deleteSubmission(selectedSubmission._id);
      setSubmissions(prev => prev.filter(s => s._id !== selectedSubmission._id));
      toast({ title: 'Success', description: 'Contact submission deleted successfully' });
      setShowDeleteDialog(false);
      setSelectedSubmission(null);
    } catch (error: any) {
      let errorMessage = 'Failed to delete submission';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const filteredSubmissions = searchQuery.trim() === ''
    ? submissions
    : submissions.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.message.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const unreadCount = submissions.filter(s => !s.is_read).length;

  return (
    <DashboardLayout userType="admin">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between page-header mb-6">
          <div>
            <h1 className="page-title">Contact Submissions</h1>
            <p className="page-subtitle">Manage messages from the contact form</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white px-3 py-1">
                {unreadCount} unread
              </Badge>
            )}
            <CustomButton
              variant="outline"
              onClick={fetchSubmissions}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </CustomButton>
          </div>
        </div>

        {/* Filters */}
        <CustomCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <CustomButton
                variant={filterRead === undefined ? 'primary' : 'outline'}
                size="sm"
                onClick={() => { setFilterRead(undefined); setCurrentPage(1); }}
              >
                All
              </CustomButton>
              <CustomButton
                variant={filterRead === false ? 'primary' : 'outline'}
                size="sm"
                onClick={() => { setFilterRead(false); setCurrentPage(1); }}
              >
                Unread
              </CustomButton>
              <CustomButton
                variant={filterRead === true ? 'primary' : 'outline'}
                size="sm"
                onClick={() => { setFilterRead(true); setCurrentPage(1); }}
              >
                Read
              </CustomButton>
            </div>
          </div>
        </CustomCard>

        {/* Table */}
        <CustomCard>
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Loading submissions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
              <CustomButton variant="outline" onClick={fetchSubmissions}>
                Try Again
              </CustomButton>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Inbox className="h-14 w-14 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No contact submissions found</p>
              <p className="text-sm mt-1">Messages from the contact form will appear here</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow
                      key={submission._id}
                      className={!submission.is_read ? 'bg-blue-500/5 dark:bg-blue-500/10 font-medium' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {!submission.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          {submission.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{submission.email}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-1">{submission.subject}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(submission.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {submission.is_read ? (
                          <Badge variant="outline" className="text-muted-foreground">Read</Badge>
                        ) : (
                          <Badge className="bg-blue-500 text-white hover:bg-blue-600">New</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setViewSubmissionDialog(true);
                              if (!submission.is_read) handleToggleReadStatus(submission);
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="View message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleReadStatus(submission)}
                            className={`p-2 rounded-md transition-colors ${submission.is_read ? 'text-muted-foreground hover:bg-muted' : 'text-blue-500 hover:bg-blue-500/10'}`}
                            title={submission.is_read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {submission.is_read ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setShowDeleteDialog(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <CustomButton
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </CustomButton>
                    <CustomButton
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </CustomButton>
                  </div>
                </div>
              )}
            </>
          )}
        </CustomCard>
      </div>

      {/* View Submission Dialog */}
      <Dialog open={viewSubmissionDialog} onOpenChange={setViewSubmissionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Contact Message
            </DialogTitle>
            <DialogDescription>
              From {selectedSubmission?.name} · {selectedSubmission ? new Date(selectedSubmission.created_at).toLocaleString('en-IN') : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">From</p>
              <p className="font-medium">{selectedSubmission?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedSubmission?.email}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Subject</p>
              <p className="font-semibold text-foreground">{selectedSubmission?.subject}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Message</p>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedSubmission?.message}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <CustomButton
              variant="outline"
              onClick={() => setViewSubmissionDialog(false)}
            >
              Close
            </CustomButton>
            {selectedSubmission && (
              <CustomButton
                variant="destructive"
                onClick={() => {
                  setViewSubmissionDialog(false);
                  setShowDeleteDialog(true);
                }}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Delete
              </CustomButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the message from <strong>{selectedSubmission?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <CustomButton
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </CustomButton>
            <CustomButton variant="destructive" onClick={handleDelete}>
              Delete
            </CustomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ContactSubmissions;