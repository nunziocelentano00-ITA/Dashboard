#!/usr/bin/perl
# Anteprima locale del sito, senza dipendenze (Perl incluso in macOS).
#   perl tools/preview-server.pl 8080   ->  http://localhost:8080/admin/
# Simula l'API GitHub su /__gh/: "Pubblica" scrive i dati in .preview/data/
# (cartella esclusa da git), così il repo vero non viene mai toccato.
use strict;
use warnings;
use IO::Socket::INET;
use JSON::PP;
use MIME::Base64 qw(decode_base64);
use File::Path qw(make_path);
use File::Basename qw(dirname);
use File::Find;
use Cwd qw(abs_path);

my $port  = shift || $ENV{PORT} || 8080;
my $root  = abs_path(dirname(abs_path($0)) . '/..');
my $store = "$root/.preview";
my $emu   = "$store/.git-emu";
make_path("$store/data", $emu);

my $json = JSON::PP->new->utf8->canonical;
my %mime = (
  html => 'text/html; charset=utf-8', js => 'text/javascript; charset=utf-8', css => 'text/css; charset=utf-8',
  json => 'application/json', svg => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', webp => 'image/webp',
  md => 'text/plain; charset=utf-8', txt => 'text/plain; charset=utf-8', enc => 'application/octet-stream'
);

my $srv = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $port, Listen => 64, ReuseAddr => 1)
  or die "Impossibile usare la porta $port: $!\n";
$| = 1;
print "Anteprima pronta: http://localhost:$port/admin/\n";

$SIG{CHLD} = 'IGNORE';
$SIG{PIPE} = 'IGNORE';
while (1) {
  my $c = $srv->accept or next;
  my $pid = fork;
  if (!defined $pid) { safe($c); close $c; next; }
  if ($pid == 0) { close $srv; safe($c); close $c; exit 0; }
  close $c;
}

sub safe {
  my $c = shift;
  eval {
    local $SIG{ALRM} = sub { die "timeout\n" };
    alarm 20;
    handle($c);
    alarm 0;
  };
  warn $@ if $@ && $@ ne "timeout\n";
}

sub handle {
  my $c = shift;
  local $/ = "\r\n";
  my $line = <$c>;
  return unless defined $line;
  $line =~ s/\r\n$//;
  my ($method, $uri) = split / /, $line;
  return unless $uri;
  my %h;
  while (my $l = <$c>) {
    $l =~ s/\r\n$//;
    last if $l eq '';
    my ($k, $v) = split /:\s*/, $l, 2;
    $h{lc $k} = $v if defined $v;
  }
  my $body = '';
  if (my $len = $h{'content-length'}) {
    my $got = 0;
    while ($got < $len) {
      my $n = read($c, $body, $len - $got, $got);
      last unless $n;
      $got += $n;
    }
  }
  my ($path, $query) = split /\?/, $uri, 2;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  return send_res($c, 403, 'text/plain', 'Vietato') if $path =~ /\.\./;

  if ($path =~ m{^/__gh/repos/[^/]+/[^/]+(.*)$}) { return gh($c, $method, $1, $body); }
  return send_res($c, 405, 'text/plain', 'Metodo non supportato') unless $method eq 'GET' || $method eq 'HEAD';
  return send_res($c, 404, 'text/plain; charset=utf-8', 'Non trovato') if $path =~ m{/\.};

  my $file = $path =~ m{^/data/(.+)$} ? "$store/data/$1" : "$root$path";
  if (-d $file && $file !~ m{/$}) { return send_res($c, 301, 'text/plain', '', "Location: $path/\r\n"); }
  $file .= 'index.html' if $file =~ m{/$};
  return send_res($c, 404, 'text/plain; charset=utf-8', 'Non trovato') unless -f $file;
  my ($ext) = $file =~ /\.([^.\/]+)$/;
  my $data = slurp($file);
  send_res($c, 200, $mime{lc($ext // '')} // 'application/octet-stream', $method eq 'HEAD' ? '' : $data);
}

sub send_res {
  my ($c, $code, $type, $body, $extra) = @_;
  my %txt = (200 => 'OK', 201 => 'Created', 301 => 'Moved Permanently', 403 => 'Forbidden', 404 => 'Not Found', 405 => 'Method Not Allowed', 422 => 'Unprocessable Entity');
  $extra //= '';
  print $c "HTTP/1.1 $code " . ($txt{$code} // '') . "\r\n"
    . "Content-Type: $type\r\nContent-Length: " . length($body) . "\r\n"
    . "Cache-Control: no-store\r\nConnection: close\r\n$extra\r\n";
  print $c $body;
}

sub slurp {
  my $f = shift;
  open my $fh, '<:raw', $f or return '';
  local $/;
  my $d = <$fh>;
  close $fh;
  return $d // '';
}

sub spit {
  my ($f, $d) = @_;
  make_path(dirname($f));
  open my $fh, '>:raw', $f or die "$f: $!";
  print $fh $d;
  close $fh;
}

sub newid { sprintf('%x%x%x', time, $$, int(rand(1e9))) }

sub data_paths {
  my @out;
  find({ no_chdir => 1, wanted => sub { push @out, substr($File::Find::name, length($store) + 1) if -f $_ } }, "$store/data");
  return @out;
}

# ---- simulazione minima dell'API Git di GitHub ----
sub gh {
  my ($c, $m, $p, $body) = @_;
  my $in = length($body) ? $json->decode($body) : {};
  my $ok = sub { send_res($c, $_[1] // 200, 'application/json', $json->encode($_[0])) };
  my $head = -f "$emu/HEAD" ? slurp("$emu/HEAD") : 'base';

  if ($m eq 'GET' && $p eq '') {
    return $ok->({ full_name => 'anteprima/locale', private => JSON::PP::false, permissions => { push => JSON::PP::true } });
  }
  if ($m eq 'GET' && $p =~ m{^/git/ref/heads/}) { return $ok->({ object => { sha => $head } }); }
  if ($m eq 'GET' && $p =~ m{^/git/commits/(.+)$}) { return $ok->({ sha => $1, tree => { sha => "tree-$1" } }); }
  if ($m eq 'GET' && $p =~ m{^/git/trees/}) {
    return $ok->({ tree => [ map { { path => $_, type => 'blob' } } data_paths() ], truncated => JSON::PP::false });
  }
  if ($m eq 'GET' && $p =~ m{^/contents/(data/.+)$}) {
    my $f = "$store/$1";
    return send_res($c, 404, 'application/json', '{"message":"Not Found"}') unless -f $f;
    return send_res($c, 200, 'application/octet-stream', slurp($f));
  }
  if ($m eq 'POST' && $p eq '/git/blobs') {
    my $id = 'blob' . newid();
    spit("$emu/$id", decode_base64($in->{content} // ''));
    return $ok->({ sha => $id }, 201);
  }
  if ($m eq 'POST' && $p eq '/git/trees') {
    my $id = 'tree' . newid();
    spit("$emu/$id", $json->encode($in->{tree} || []));
    return $ok->({ sha => $id }, 201);
  }
  if ($m eq 'POST' && $p eq '/git/commits') {
    my $id = 'commit' . newid();
    spit("$emu/$id", $in->{tree} // '');
    return $ok->({ sha => $id }, 201);
  }
  if ($m eq 'PATCH' && $p =~ m{^/git/refs/heads/}) {
    my $cid = $in->{sha} // '';
    return send_res($c, 422, 'application/json', '{"message":"Commit sconosciuto"}') unless $cid =~ /^commit\w+$/ && -f "$emu/$cid";
    my $tid = slurp("$emu/$cid");
    my $tree = $json->decode(slurp("$emu/$tid") || '[]');
    my $n = 0;
    for my $e (@$tree) {
      my $path = $e->{path} // '';
      next if $path =~ /\.\./ || $path !~ m{^data/};
      my $f = "$store/$path";
      if (!defined $e->{sha}) { unlink $f; $n++; next; }
      next unless $e->{sha} =~ /^blob\w+$/ && -f "$emu/$e->{sha}";
      spit($f, slurp("$emu/$e->{sha}"));
      $n++;
    }
    opendir(my $dh, $emu);
    unlink map { "$emu/$_" } grep { /^(blob|tree|commit)/ } readdir $dh;
    closedir $dh;
    spit("$emu/HEAD", $cid);
    print "Pubblicato in locale: $n file aggiornati in .preview/data\n";
    return $ok->({ object => { sha => $cid } });
  }
  send_res($c, 404, 'application/json', '{"message":"Not Found"}');
}
