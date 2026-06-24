
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CustomCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  isHoverable?: boolean;
  isSelectable?: boolean;
}

const CustomCard = ({
  title,
  subtitle,
  children,
  footer,
  className,
  contentClassName,
  headerClassName,
  footerClassName,
  isHoverable = false,
  isSelectable = false,
}: CustomCardProps) => {
  return (
    <Card className={cn(
      className,
      isHoverable && 'transition-shadow hover:shadow-lg',
      isSelectable && 'cursor-pointer transition-all hover:border-primary hover:bg-secondary/30'
    )}>
      {(title || subtitle) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("pt-0", !title && !subtitle && "pt-6", contentClassName)}>
        {children}
      </CardContent>
      {footer && <CardFooter className={cn("flex justify-between", footerClassName)}>{footer}</CardFooter>}
    </Card>
  );
};

export default CustomCard;
