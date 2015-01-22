#!/usr/bin/perl

use File::Find;
use JSON;
use IO::File;
my $top = shift;
my $total = 0;
die "needs directory" unless -d $top;

my @tzs = ();

sub process {
  (my $dir = $File::Find::dir) =~ s#^$top\/?##;
  (my $name = $File::Find::name) =~ s#^$top\/?##;
  $dir =~ s/\s/_/g;
  (my $fsname = $name) =~ s/\s/_/g;
  return unless -f $File::Find::name;
  my @s = stat(_);
  my $f = IO::File->new("< $File::Find::name") || die "Cannot read: $File::Find::name";
  return unless sysread($f, my $hdr, 4) == 4;
  return unless $hdr eq "TZif";
  seek($f,0,0);
  sysread($f, my $data, $s[7]);
  $data =~ s/(.)/sprintf("%02x", ord($1))/egs;
  mkdir("zoneinfo/$dir") unless -d "zoneinfo/$dir";
  my $o = IO::File->new(">zoneinfo/$fsname.json") || die "Cannot create $fsname: $!";
  print $o "{'data':'$data'};\n";
  print " in $dir -> $fsname $s[7]\n";
  $total++;
  push @tzs, $name;
}
mkdir('zoneinfo') unless -d 'zoneinfo';
find({ wanted => \&process, no_chdir => 1, follow => 1 }, $top);

print "Total: $total\n";

my $list = IO::File->new(">zones.json");
print $list encode_json(\@tzs);
